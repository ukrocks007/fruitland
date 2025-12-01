import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';

// PATCH - Update order status, payment status, or assign delivery partner
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status, paymentStatus, deliveryPartnerId } = await request.json();

    const updateData: {
      status?: string;
      paymentStatus?: string;
      deliveryPartnerId?: string | null;
    } = {};

    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (deliveryPartnerId !== undefined) {
      // Verify the delivery partner exists and has the correct role
      if (deliveryPartnerId !== null) {
        const deliveryPartner = await prisma.user.findFirst({
          where: {
            id: deliveryPartnerId,
            role: Role.DELIVERY_PARTNER,
          },
        });

        if (!deliveryPartner) {
          return NextResponse.json(
            { error: 'Invalid delivery partner' },
            { status: 400 }
          );
        }
      }
      updateData.deliveryPartnerId = deliveryPartnerId;
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

// DELETE - Delete order
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    // Delete the order (OrderItems will be cascade deleted)
    const deletedOrder = await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Order deleted successfully',
      order: deletedOrder 
    });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ 
      error: 'Failed to delete order',
      details: error.message 
    }, { status: 500 });
  }
}
