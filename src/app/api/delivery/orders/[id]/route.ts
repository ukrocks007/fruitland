import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, OrderStatus, PaymentStatus } from '@/types';

// PATCH - Update order status or payment status by delivery partner
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.DELIVERY_PARTNER) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status, paymentStatus, deliveryNotes } = await request.json();

    // Verify this order is assigned to this delivery partner
    const existingOrder = await prisma.order.findFirst({
      where: {
        id,
        deliveryPartnerId: session.user.id,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found or not assigned to you' },
        { status: 404 }
      );
    }

    // Validate status values if provided
    const validStatuses = Object.values(OrderStatus);
    const validPaymentStatuses = Object.values(PaymentStatus);

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        { error: 'Invalid payment status' },
        { status: 400 }
      );
    }

    // Delivery partners can only update to certain statuses
    const allowedDeliveryStatuses = [
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ];

    if (status && !allowedDeliveryStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'You can only update to OUT_FOR_DELIVERY or DELIVERED status' },
        { status: 403 }
      );
    }

    // Delivery partners can only update payment status to PAID (for COD)
    if (paymentStatus && paymentStatus !== PaymentStatus.PAID) {
      return NextResponse.json(
        { error: 'You can only update payment status to PAID' },
        { status: 403 }
      );
    }

    const updateData: {
      status?: string;
      paymentStatus?: string;
      deliveryNotes?: string;
    } = {};

    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (deliveryNotes !== undefined) updateData.deliveryNotes = deliveryNotes;

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        address: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// GET - Get a specific order assigned to the delivery partner
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.DELIVERY_PARTNER) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        deliveryPartnerId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        address: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or not assigned to you' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
