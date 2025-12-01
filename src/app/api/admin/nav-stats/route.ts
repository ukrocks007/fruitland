import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [
            pendingOrders,
            pendingBulkOrders,
            pendingRefunds,
            pendingReviews,
            lowStockProducts
        ] = await Promise.all([
            prisma.order.count({
                where: {
                    status: 'PENDING',
                    isBulkOrder: false,
                },
            }),
            prisma.order.count({
                where: {
                    isBulkOrder: true,
                    bulkOrderStatus: 'PENDING_APPROVAL',
                },
            }),
            prisma.refund.count({
                where: {
                    status: 'REQUESTED',
                },
            }),
            prisma.review.count({
                where: {
                    status: 'PENDING',
                },
            }),
            prisma.product.count({
                where: {
                    stock: {
                        lt: 10,
                    },
                },
            }),
        ]);

        return NextResponse.json({
            orders: pendingOrders,
            bulkOrders: pendingBulkOrders,
            refunds: pendingRefunds,
            reviews: pendingReviews,
            inventory: lowStockProducts,
        });
    } catch (error: any) {
        console.error('Error fetching nav stats:', {
            message: error.message,
            stack: error.stack,
            cause: error.cause,
            name: error.name
        });
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
