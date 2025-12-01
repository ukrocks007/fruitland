import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';

// GET single warehouse
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

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        productStocks: {
          include: {
            product: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    return NextResponse.json({ warehouse });
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    return NextResponse.json(
      { error: 'Failed to fetch warehouse' },
      { status: 500 }
    );
  }
}

// PATCH update warehouse
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
    const { name, city, pincode, zone, contactName, contactPhone, contactEmail, isActive } = body;

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(city !== undefined && { city }),
        ...(pincode !== undefined && { pincode }),
        ...(zone !== undefined && { zone }),
        ...(contactName !== undefined && { contactName }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ warehouse });
  } catch (error) {
    console.error('Error updating warehouse:', error);
    return NextResponse.json(
      { error: 'Failed to update warehouse' },
      { status: 500 }
    );
  }
}

// DELETE warehouse
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

    // Check if warehouse has orders
    const ordersCount = await prisma.order.count({
      where: { warehouseId: id },
    });

    if (ordersCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete warehouse with existing orders' },
        { status: 400 }
      );
    }

    // Check if warehouse has stock records with non-zero quantity
    const stocksWithQuantity = await prisma.productStock.count({
      where: { 
        warehouseId: id,
        quantity: { gt: 0 },
      },
    });

    if (stocksWithQuantity > 0) {
      return NextResponse.json(
        { error: 'Cannot delete warehouse with existing stock. Please transfer or clear stock first.' },
        { status: 400 }
      );
    }

    // Delete any empty stock records first
    await prisma.productStock.deleteMany({
      where: { warehouseId: id },
    });

    await prisma.warehouse.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting warehouse:', error);
    return NextResponse.json(
      { error: 'Failed to delete warehouse' },
      { status: 500 }
    );
  }
}
