import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import { getTenantBySlug, validateTenantAccess } from '@/lib/tenant';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get tenantSlug from query params
        const { searchParams } = new URL(request.url);
        const tenantSlug = searchParams.get('tenantSlug');

        let tenantId: string | undefined;

        if (tenantSlug) {
            const tenant = await getTenantBySlug(tenantSlug);
            if (!tenant) {
                return NextResponse.json(
                    { error: 'Tenant not found' },
                    { status: 404 }
                );
            }

            // Validate tenant access
            if (!validateTenantAccess(session.user.role, session.user.tenantId, tenant.id)) {
                return NextResponse.json(
                    { error: 'Access denied to this tenant' },
                    { status: 403 }
                );
            }

            tenantId = tenant.id;
        } else if (session.user.tenantId) {
            tenantId = session.user.tenantId;
        }

        const where: any = tenantId ? { tenantId } : {};

        const [
            pendingOrders,
            pendingBulkOrders,
            pendingRefunds,
            pendingReviews,
            lowStockProducts
        ] = await Promise.all([
            prisma.order.count({
                where: {
                    ...where,
                    status: 'PENDING',
                    isBulkOrder: false,
                },
            }),
            prisma.order.count({
                where: {
                    ...where,
                    isBulkOrder: true,
                    bulkOrderStatus: 'PENDING_APPROVAL',
                },
            }),
            prisma.refund.count({
                where: {
                    ...where,
                    status: 'REQUESTED',
                },
            }),
            prisma.review.count({
                where: {
                    ...where,
                    status: 'PENDING',
                },
            }),
            prisma.product.count({
                where: {
                    ...where,
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
