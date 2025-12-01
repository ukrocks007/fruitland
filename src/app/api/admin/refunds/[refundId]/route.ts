import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';

// GET - Get details of a specific refund
export async function GET(
  request: Request,
  { params }: { params: Promise<{ refundId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { refundId } = await params;

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            paymentMethod: true,
            paymentStatus: true,
            status: true,
            razorpayPaymentId: true,
            razorpayOrderId: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            address: {
              select: {
                name: true,
                phone: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                pincode: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    price: true,
                  },
                },
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

    if (!refund) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
    }

    return NextResponse.json(refund);
  } catch (error) {
    console.error('Error fetching refund:', error);
    return NextResponse.json({ error: 'Failed to fetch refund' }, { status: 500 });
  }
}
