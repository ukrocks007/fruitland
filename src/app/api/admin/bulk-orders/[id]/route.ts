import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, BulkOrderStatus } from '@/types';

// GST rate for bulk orders (configurable)
const BULK_ORDER_GST_RATE = Number(process.env.BULK_ORDER_GST_RATE) || 18;

// PATCH - Update bulk order status (approve/reject/update)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { bulkOrderStatus, paymentStatus, status, deliveryPartnerId } = body;

    // Verify the order exists and is a bulk order
    const existingOrder = await prisma.order.findFirst({
      where: { id, isBulkOrder: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Bulk order not found' }, { status: 404 });
    }

    const updateData: {
      bulkOrderStatus?: string;
      paymentStatus?: string;
      status?: string;
      deliveryPartnerId?: string | null;
    } = {};

    if (bulkOrderStatus) {
      // Validate bulk order status
      const validStatuses = Object.values(BulkOrderStatus);
      if (!validStatuses.includes(bulkOrderStatus)) {
        return NextResponse.json({ error: 'Invalid bulk order status' }, { status: 400 });
      }
      updateData.bulkOrderStatus = bulkOrderStatus;

      // When approved, reserve stock
      if (bulkOrderStatus === BulkOrderStatus.APPROVED && existingOrder.bulkOrderStatus !== BulkOrderStatus.APPROVED) {
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId: id },
          include: { product: true },
        });

        // Check stock availability and reserve
        for (const item of orderItems) {
          if (item.product.stock < item.quantity) {
            return NextResponse.json(
              { error: `Insufficient stock for ${item.product.name}` },
              { status: 400 }
            );
          }
        }

        // Decrement stock for approved orders
        for (const item of orderItems) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
            },
          });
        }
      }
    }

    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (status) updateData.status = status;
    if (deliveryPartnerId !== undefined) {
      if (deliveryPartnerId !== null) {
        const deliveryPartner = await prisma.user.findFirst({
          where: { id: deliveryPartnerId, role: Role.DELIVERY_PARTNER },
        });
        if (!deliveryPartner) {
          return NextResponse.json({ error: 'Invalid delivery partner' }, { status: 400 });
        }
      }
      updateData.deliveryPartnerId = deliveryPartnerId;
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
        },
        address: true,
        deliveryPartner: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating bulk order:', error);
    return NextResponse.json({ error: 'Failed to update bulk order' }, { status: 500 });
  }
}

// GET - Get single bulk order with invoice data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format'); // 'invoice' for invoice data

    const order = await prisma.order.findFirst({
      where: { id, isBulkOrder: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, category: true },
            },
          },
        },
        address: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Bulk order not found' }, { status: 404 });
    }

    if (format === 'invoice') {
      // Calculate invoice details
      const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountPercent = order.bulkDiscountPercent || 0;
      const discountAmount = subtotal * (discountPercent / 100);
      const taxableAmount = subtotal - discountAmount;
      // GST calculation - Apply GST only if GST number provided
      const gstRate = order.bulkCustomerGST ? BULK_ORDER_GST_RATE : 0;
      const gstAmount = taxableAmount * (gstRate / 100);
      const grandTotal = taxableAmount + gstAmount;

      const invoiceData = {
        invoiceNumber: `INV-${order.orderNumber}`,
        invoiceDate: new Date().toISOString(),
        order,
        customer: {
          name: order.bulkCustomerName,
          contact: order.bulkCustomerContact,
          gstNumber: order.bulkCustomerGST,
          address: order.address,
        },
        items: order.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity,
        })),
        summary: {
          subtotal,
          discountPercent,
          discountAmount,
          taxableAmount,
          gstRate,
          gstAmount,
          grandTotal,
        },
      };

      return NextResponse.json(invoiceData);
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching bulk order:', error);
    return NextResponse.json({ error: 'Failed to fetch bulk order' }, { status: 500 });
  }
}

// DELETE - Delete bulk order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: { id, isBulkOrder: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Bulk order not found' }, { status: 404 });
    }

    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Bulk order deleted' });
  } catch (error) {
    console.error('Error deleting bulk order:', error);
    return NextResponse.json({ error: 'Failed to delete bulk order' }, { status: 500 });
  }
}
