import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createRazorpayOrder } from '@/lib/razorpay';
import { prisma } from '@/lib/prisma';
import { awardLoyaltyPoints, redeemLoyaltyPoints, getLoyaltySettings } from '@/lib/loyalty';

interface OrderItem {
  productId: string;
  quantity: number;
}

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
    const { items, addressId, subscriptionId, paymentMethod = 'ONLINE', redeemPoints = 0 } = body;

    if (!items || !Array.isArray(items) || items.length === 0 || !addressId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch product details and calculate total amount
    const productIds = items.map((item: OrderItem) => item.productId);
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

    // Calculate total amount and prepare order items with prices
    let totalAmount = 0;
    const orderItems = items.map((item: OrderItem) => {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Check stock availability
      if (product.stock < item.quantity) {
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

    // Handle points redemption
    let pointsRedeemed = 0;
    let pointsDiscount = 0;

    if (redeemPoints > 0) {
      const settings = await getLoyaltySettings();
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { pointsBalance: true },
      });

      if (!user || user.pointsBalance < redeemPoints) {
        return NextResponse.json(
          { error: 'Insufficient points balance' },
          { status: 400 }
        );
      }

      if (redeemPoints < settings.minRedeemablePoints) {
        return NextResponse.json(
          { error: `Minimum ${settings.minRedeemablePoints} points required to redeem` },
          { status: 400 }
        );
      }

      // Validate point value is positive to avoid division by zero
      if (settings.pointValueInRupees <= 0) {
        return NextResponse.json(
          { error: 'Invalid loyalty point configuration' },
          { status: 500 }
        );
      }

      pointsRedeemed = redeemPoints;
      pointsDiscount = redeemPoints * settings.pointValueInRupees;
      
      // Ensure discount doesn't exceed total
      if (pointsDiscount > totalAmount) {
        pointsDiscount = totalAmount;
        pointsRedeemed = Math.ceil(totalAmount / settings.pointValueInRupees);
      }
    }

    const finalAmount = totalAmount - pointsDiscount;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order in database
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        addressId,
        orderNumber,
        totalAmount: finalAmount,
        pointsRedeemed,
        pointsDiscount,
        status: 'PENDING',
        paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
        subscriptionId: subscriptionId || null,
        items: {
          create: orderItems,
        },
      },
    });

    // If points were redeemed, deduct them and create transaction
    if (pointsRedeemed > 0) {
      await redeemLoyaltyPoints(session.user.id, pointsRedeemed, order.id);
    }

    // If COD, skip Razorpay and return order details
    if (paymentMethod === 'COD') {
      // Update product stock
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

      // Award loyalty points for COD orders (based on final amount after discount)
      const loyaltyResult = await awardLoyaltyPoints(
        session.user.id,
        order.id,
        finalAmount
      );

      return NextResponse.json({
        orderId: order.id,
        orderNumber,
        paymentMethod: 'COD',
        totalAmount: finalAmount,
        pointsRedeemed,
        pointsDiscount,
        loyaltyPointsEarned: loyaltyResult.pointsEarned,
        newPointsBalance: loyaltyResult.newBalance,
      });
    }

    // Create Razorpay order (convert to paise)
    const razorpayOrder = await createRazorpayOrder(
      Math.round(finalAmount * 100), // Convert to paise
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

    // Update product stock
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

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      id: razorpayOrder.id, // Razorpay order ID
      receipt: order.id, // Our internal order ID
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      pointsRedeemed,
      pointsDiscount,
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
