import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BulkOrderStatus } from '@/types';

interface BulkOrderItem {
  productId: string;
  quantity: number;
}

interface CreateBulkOrderBody {
  items: BulkOrderItem[];
  addressId: string;
  bulkCustomerName: string;
  bulkCustomerContact: string;
  bulkCustomerGST?: string;
  bulkOrderNote?: string;
}

// GET - List bulk orders for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
        isBulkOrder: true,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        address: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching bulk orders:', error);
    return NextResponse.json({ error: 'Failed to fetch bulk orders' }, { status: 500 });
  }
}

// POST - Create a new bulk order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateBulkOrderBody = await request.json();
    const { items, addressId, bulkCustomerName, bulkCustomerContact, bulkCustomerGST, bulkOrderNote } = body;

    if (!items || !Array.isArray(items) || items.length === 0 || !addressId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!bulkCustomerName || !bulkCustomerContact) {
      return NextResponse.json({ error: 'Bulk customer name and contact are required' }, { status: 400 });
    }

    // Fetch product details
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== items.length) {
      return NextResponse.json({ error: 'Some products not found' }, { status: 404 });
    }

    // Calculate total quantity for discount determination
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Calculate bulk discount based on total quantity
    // Discount tiers: 10+ items = 5%, 25+ items = 10%, 50+ items = 15%, 100+ items = 20%
    let bulkDiscountPercent = 0;
    if (totalQuantity >= 100) {
      bulkDiscountPercent = 20;
    } else if (totalQuantity >= 50) {
      bulkDiscountPercent = 15;
    } else if (totalQuantity >= 25) {
      bulkDiscountPercent = 10;
    } else if (totalQuantity >= 10) {
      bulkDiscountPercent = 5;
    }

    // Calculate total amount and prepare order items
    let subtotal = 0;
    const orderItems = items.map((item) => {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Check stock availability
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }
      
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      };
    });

    // Apply discount
    const discountAmount = subtotal * (bulkDiscountPercent / 100);
    const totalAmount = subtotal - discountAmount;

    // Generate order number using crypto for better uniqueness
    const randomPart = crypto.randomUUID().split('-')[0].toUpperCase();
    const orderNumber = `BULK-${Date.now()}-${randomPart}`;

    // Create bulk order (payment pending until admin confirms)
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        addressId,
        orderNumber,
        totalAmount,
        status: 'PENDING',
        paymentStatus: 'PENDING', // Payment is pending for bulk orders (offline payment)
        isBulkOrder: true,
        bulkCustomerName,
        bulkCustomerContact,
        bulkCustomerGST: bulkCustomerGST || null,
        bulkDiscountPercent,
        bulkOrderNote: bulkOrderNote || null,
        bulkOrderStatus: BulkOrderStatus.PENDING_APPROVAL,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        address: true,
      },
    });

    return NextResponse.json({
      success: true,
      order,
      subtotal,
      discountPercent: bulkDiscountPercent,
      discountAmount,
      totalAmount,
    });
  } catch (error) {
    console.error('Error creating bulk order:', error);
    const message = error instanceof Error ? error.message : 'Failed to create bulk order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
