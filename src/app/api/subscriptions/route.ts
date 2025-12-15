import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addDays, addWeeks, addMonths } from 'date-fns';

// GET user subscriptions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        address: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

// POST - Create new subscription
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
    const { frequency, preference, addressId, items, totalAmount } = body;

    if (!frequency || !preference || !addressId || !items || !totalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate next delivery date based on frequency
    let nextDeliveryDate = new Date();
    switch (frequency) {
      case 'DAILY':
        nextDeliveryDate = addDays(nextDeliveryDate, 1);
        break;
      case 'ALTERNATE_DAYS':
        nextDeliveryDate = addDays(nextDeliveryDate, 2);
        break;
      case 'WEEKLY':
        nextDeliveryDate = addWeeks(nextDeliveryDate, 1);
        break;
      case 'BIWEEKLY':
        nextDeliveryDate = addWeeks(nextDeliveryDate, 2);
        break;
      case 'MONTHLY':
        nextDeliveryDate = addMonths(nextDeliveryDate, 1);
        break;
    }

    // Generate subscription number
    const subscriptionNumber = `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        addressId,
        subscriptionNumber,
        frequency,
        preference,
        totalAmount,
        nextDeliveryDate,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
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

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
