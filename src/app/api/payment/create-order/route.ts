import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createRazorpayOrder } from '@/lib/razorpay';
import { prisma } from '@/lib/prisma';
import { findWarehouseWithStock, allocateStock, confirmStockAllocation } from '@/lib/warehouse-stock';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { items, addressId, subscriptionId, paymentMethod = 'ONLINE' } = body;

    if (!items || !Array.isArray(items) || items.length === 0 || !addressId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch product details and calculate total amount
    const productIds = items.map((item: { productId: string }) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    if (products.length !== items.length) {
      return NextResponse.json(
        { error: 'Some products not found' },
        { status: 404 }
      );
    }

    // Fetch delivery address for warehouse selection
    const deliveryAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    // Prepare order items with quantities for warehouse check
    const stockItems = items.map((item: { productId: string; quantity: number }) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    // Try to find a warehouse with sufficient stock
    const warehouseId = await findWarehouseWithStock(stockItems, deliveryAddress?.pincode);

    // Calculate total amount and prepare order items with prices
    let totalAmount = 0;
    const orderItems = items.map((item: { productId: string; quantity: number }) => {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        throw new Error('Product not found');
      }
      
      // If no warehouse has stock, fall back to checking product's global stock
      if (!warehouseId && product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      };
    });

    // If warehouse found, allocate stock from warehouse
    if (warehouseId) {
      const allocationResult = await allocateStock(warehouseId, stockItems);
      if (!allocationResult.success) {
        return NextResponse.json(
          { error: 'Failed to allocate stock from warehouse' },
          { status: 500 }
        );
      }
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order in database
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        addressId,
        orderNumber,
        totalAmount,
        status: 'PENDING',
        paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
        subscriptionId: subscriptionId || null,
        warehouseId: warehouseId || null,
        items: {
          create: orderItems,
        },
      },
    });

    // If COD, skip Razorpay and return order details
    if (paymentMethod === 'COD') {
      // Update product stock (global) and confirm warehouse allocation
      for (const item of orderItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Confirm warehouse stock allocation if applicable
      if (warehouseId) {
        await confirmStockAllocation(warehouseId, stockItems);
      }

      return NextResponse.json({
        orderId: order.id,
        orderNumber,
        paymentMethod: 'COD',
        totalAmount,
        warehouseId,
      });
    }

    // Create Razorpay order (convert to paise)
    const razorpayOrder = await createRazorpayOrder(
      Math.round(totalAmount * 100), // Convert to paise
      orderNumber,
      {
        orderId: order.id,
        userId: session.user.id,
      }
    );

    // Update order with Razorpay order ID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        razorpayOrderId: razorpayOrder.id,
      },
    });

    // Update product stock (global) and confirm warehouse allocation
    for (const item of orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Confirm warehouse stock allocation if applicable
    if (warehouseId) {
      await confirmStockAllocation(warehouseId, stockItems);
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      id: razorpayOrder.id, // Razorpay order ID
      receipt: order.id, // Our internal order ID
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      warehouseId,
    });
  } catch (error: unknown) {
    console.error('Error creating order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
