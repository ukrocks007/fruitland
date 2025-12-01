import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, RefundStatus, RefundMethod, PaymentStatus } from '@/types';

// POST - Request a refund for an order
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, amount, reason, refundMethod } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid refund amount is required' }, { status: 400 });
    }

    if (!reason || reason.trim() === '') {
      return NextResponse.json({ error: 'Refund reason is required' }, { status: 400 });
    }

    if (!refundMethod || !Object.values(RefundMethod).includes(refundMethod)) {
      return NextResponse.json({ error: 'Valid refund method (ONLINE or COD) is required' }, { status: 400 });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        refunds: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if order has been paid
    if (order.paymentStatus !== PaymentStatus.PAID) {
      return NextResponse.json(
        { error: 'Only paid orders can be refunded' },
        { status: 400 }
      );
    }

    // Calculate total already refunded
    const totalRefunded = order.refunds
      .filter(r => r.status === RefundStatus.COMPLETED)
      .reduce((sum, r) => sum + r.refundAmount, 0);

    // Check if refund amount exceeds remaining refundable amount
    const remainingRefundable = order.totalAmount - totalRefunded;
    if (amount > remainingRefundable) {
      return NextResponse.json(
        { error: `Refund amount exceeds remaining refundable amount (₹${remainingRefundable.toFixed(2)})` },
        { status: 400 }
      );
    }

    // Check for pending refund requests on this order
    const pendingRefund = order.refunds.find(
      r => r.status === RefundStatus.REQUESTED || r.status === RefundStatus.APPROVED
    );
    if (pendingRefund) {
      return NextResponse.json(
        { error: 'A refund request is already pending for this order' },
        { status: 400 }
      );
    }

    // For ONLINE refunds, check if we have the razorpayPaymentId
    if (refundMethod === RefundMethod.ONLINE && !order.razorpayPaymentId) {
      return NextResponse.json(
        { error: 'Cannot process online refund: No Razorpay payment ID found for this order' },
        { status: 400 }
      );
    }

    // Create the refund request
    const refund = await prisma.refund.create({
      data: {
        orderId,
        refundAmount: amount,
        refundReason: reason.trim(),
        refundMethod,
        status: RefundStatus.REQUESTED,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            paymentMethod: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(refund, { status: 201 });
  } catch (error) {
    console.error('Error creating refund request:', error);
    return NextResponse.json({ error: 'Failed to create refund request' }, { status: 500 });
  }
}
