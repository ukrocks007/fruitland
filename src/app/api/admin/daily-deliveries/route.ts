import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { startOfDay, endOfDay, addDays, addWeeks, addMonths } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== Role.ADMIN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const today = new Date();
        const endOfToday = endOfDay(today);

        // Find subscriptions due for delivery today or before
        const subscriptions = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
                nextDeliveryDate: {
                    lte: endOfToday,
                },
            },
            include: {
                user: { select: { name: true, phone: true } },
                address: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: {
                nextDeliveryDate: 'asc',
            },
        });

        return NextResponse.json({ deliveries: subscriptions });
    } catch (error) {
        console.error('Error fetching daily deliveries:', error);
        return NextResponse.json(
            { error: 'Failed to fetch deliveries' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== Role.ADMIN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subscriptionId, status, notes } = await request.json(); // status: 'DELIVERED', 'MISSED'

        if (!subscriptionId || !status) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const subscription = await prisma.subscription.findUnique({
            where: { id: subscriptionId },
            include: { items: { include: { product: true } } }
        });

        if (!subscription) {
            return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
        }

        // Create an Order record if Delivered or Missed (to track history)
        // If delivered, we assume payment is handled via subscription balance or COD/Monthly Bill.
        // For now, we just create a record.

        await prisma.order.create({
            data: {
                userId: subscription.userId,
                addressId: subscription.addressId,
                subscriptionId: subscription.id,
                orderNumber: `DEL-${Date.now()}`,
                totalAmount: subscription.totalAmount,
                status: status, // DELIVERED, MISSED
                paymentStatus: status === 'DELIVERED' ? 'PAID' : 'PENDING', // Simplified assumption
                deliveryNotes: notes,
                items: {
                    create: subscription.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.product.price
                    }))
                }
            }
        });

        // Update Subscription Next Delivery Date
        let nextDate = new Date(subscription.nextDeliveryDate);
        switch (subscription.frequency) {
            case 'DAILY':
                nextDate = addDays(nextDate, 1);
                break;
            case 'ALTERNATE_DAYS':
                nextDate = addDays(nextDate, 2);
                break;
            case 'WEEKLY':
                nextDate = addWeeks(nextDate, 1);
                break;
            case 'BIWEEKLY':
                nextDate = addWeeks(nextDate, 2);
                break;
            case 'MONTHLY':
                nextDate = addMonths(nextDate, 1);
                break;
        }

        // If next date is still in past (e.g. missed multiple days), bump it to tomorrow relative to today? 
        // Or strictly follow schedule? Strictly following schedule is better for accounting.
        // But for "Daily", getting caught up might mean marking 5 days as missed.

        await prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                nextDeliveryDate: nextDate
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error processing delivery:', error);
        return NextResponse.json(
            { error: 'Failed to process delivery' },
            { status: 500 }
        );
    }
}
