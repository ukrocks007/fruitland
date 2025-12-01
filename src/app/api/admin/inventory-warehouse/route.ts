import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';

// GET all product stocks across warehouses
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const productId = searchParams.get('productId');

    const where: { warehouseId?: string; productId?: string } = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;

    const productStocks = await prisma.productStock.findMany({
      where,
      include: {
        warehouse: true,
        product: true,
      },
      orderBy: [
        { warehouse: { name: 'asc' } },
        { product: { name: 'asc' } },
      ],
    });

    return NextResponse.json({ productStocks });
  } catch (error) {
    console.error('Error fetching product stocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product stocks' },
      { status: 500 }
    );
  }
}

// POST create or update product stock
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { warehouseId, productId, quantity, reservedQuantity } = body;

    if (!warehouseId || !productId) {
      return NextResponse.json(
        { error: 'Warehouse ID and Product ID are required' },
        { status: 400 }
      );
    }

    if (quantity !== undefined && quantity < 0) {
      return NextResponse.json(
        { error: 'Quantity cannot be negative' },
        { status: 400 }
      );
    }

    // Upsert the product stock
    const productStock = await prisma.productStock.upsert({
      where: {
        warehouseId_productId: {
          warehouseId,
          productId,
        },
      },
      update: {
        ...(quantity !== undefined && { quantity }),
        ...(reservedQuantity !== undefined && { reservedQuantity }),
      },
      create: {
        warehouseId,
        productId,
        quantity: quantity || 0,
        reservedQuantity: reservedQuantity || 0,
      },
      include: {
        warehouse: true,
        product: true,
      },
    });

    return NextResponse.json({ productStock }, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating product stock:', error);
    return NextResponse.json(
      { error: 'Failed to create/update product stock' },
      { status: 500 }
    );
  }
}

// PATCH for stock transfer between warehouses
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fromWarehouseId, toWarehouseId, productId, transferQuantity } = body;

    if (!fromWarehouseId || !toWarehouseId || !productId || !transferQuantity) {
      return NextResponse.json(
        { error: 'All fields are required for stock transfer' },
        { status: 400 }
      );
    }

    if (transferQuantity <= 0) {
      return NextResponse.json(
        { error: 'Transfer quantity must be positive' },
        { status: 400 }
      );
    }

    // Check source warehouse stock
    const sourceStock = await prisma.productStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: fromWarehouseId,
          productId,
        },
      },
    });

    if (!sourceStock || sourceStock.quantity - sourceStock.reservedQuantity < transferQuantity) {
      return NextResponse.json(
        { error: 'Insufficient available stock in source warehouse' },
        { status: 400 }
      );
    }

    // Perform transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Decrement source warehouse
      const updatedSource = await tx.productStock.update({
        where: {
          warehouseId_productId: {
            warehouseId: fromWarehouseId,
            productId,
          },
        },
        data: {
          quantity: {
            decrement: transferQuantity,
          },
        },
        include: {
          warehouse: true,
          product: true,
        },
      });

      // Upsert destination warehouse
      const updatedDestination = await tx.productStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: toWarehouseId,
            productId,
          },
        },
        update: {
          quantity: {
            increment: transferQuantity,
          },
        },
        create: {
          warehouseId: toWarehouseId,
          productId,
          quantity: transferQuantity,
          reservedQuantity: 0,
        },
        include: {
          warehouse: true,
          product: true,
        },
      });

      return { source: updatedSource, destination: updatedDestination };
    });

    return NextResponse.json({
      success: true,
      transfer: {
        from: result.source,
        to: result.destination,
        quantity: transferQuantity,
      },
    });
  } catch (error) {
    console.error('Error transferring stock:', error);
    return NextResponse.json(
      { error: 'Failed to transfer stock' },
      { status: 500 }
    );
  }
}
