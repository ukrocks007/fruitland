import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, RefundStatus, RefundMethod, PaymentStatus } from '@/types';
import { initiateRefund } from '@/lib/razorpay';

// POST - Approve or reject a refund request
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { refundId, action, rejectionReason } = body;

    // Validate required fields
    if (!refundId) {
      return NextResponse.json({ error: 'Refund ID is required' }, { status: 400 });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be either "approve" or "reject"' }, { status: 400 });
    }

    // Find the refund
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: true,
      },
    });

    if (!refund) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
    }

    // Check if refund is in REQUESTED status
    if (refund.status !== RefundStatus.REQUESTED) {
      return NextResponse.json(
        { error: `Cannot ${action} refund with status: ${refund.status}` },
        { status: 400 }
      );
    }

    // Handle rejection
    if (action === 'reject') {
      if (!rejectionReason || rejectionReason.trim() === '') {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
      }

      const updatedRefund = await prisma.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.REJECTED,
          refundReason: `${refund.refundReason} | REJECTED: ${rejectionReason.trim()}`,
          processedBy: session.user.id,
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          processedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json(updatedRefund);
    }

    // Handle approval
    // First, mark as APPROVED
    await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.APPROVED,
        processedBy: session.user.id,
      },
    });

    let finalStatus: string = RefundStatus.COMPLETED;
    let razorpayRefundId: string | null = null;

    // For ONLINE refunds, call Razorpay API
    if (refund.refundMethod === RefundMethod.ONLINE) {
      if (!refund.order.razorpayPaymentId) {
        // Rollback to REQUESTED status
        await prisma.refund.update({
          where: { id: refundId },
          data: {
            status: RefundStatus.REQUESTED,
            processedBy: null,
          },
        });

        return NextResponse.json(
          { error: 'Cannot process online refund: No Razorpay payment ID found' },
          { status: 400 }
        );
      }

      try {
        const razorpayRefund = await initiateRefund(
          refund.order.razorpayPaymentId,
          refund.refundAmount
        );
        razorpayRefundId = razorpayRefund.id;
        finalStatus = RefundStatus.COMPLETED;
      } catch (razorpayError) {
        console.error('Razorpay refund error:', razorpayError);
        finalStatus = RefundStatus.FAILED;
      }
    }
    // For COD refunds, just mark as completed (manual refund)

    // Update refund with final status
    const updatedRefund = await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: finalStatus,
        razorpayRefundId,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        processedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If refund completed, update order payment status
    if (finalStatus === RefundStatus.COMPLETED) {
      // Calculate total refunded for this order
      const allRefunds = await prisma.refund.findMany({
        where: {
          orderId: refund.orderId,
          status: RefundStatus.COMPLETED,
        },
      });

      const totalRefunded = allRefunds.reduce((sum, r) => sum + r.refundAmount, 0);

      // If total refunded equals or exceeds order total, mark as REFUNDED
      if (totalRefunded >= refund.order.totalAmount) {
        await prisma.order.update({
          where: { id: refund.orderId },
          data: {
            paymentStatus: PaymentStatus.REFUNDED,
          },
        });
      }
    }

    return NextResponse.json(updatedRefund);
  } catch (error) {
    console.error('Error processing refund:', error);
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 });
  }
}
