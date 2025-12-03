import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';

/**
 * GET /api/superadmin/analytics - Get global system analytics (SUPERADMIN only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.SUPERADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get global counts
    const [
      totalTenants,
      totalUsers,
      totalOrders,
      totalProducts,
      totalSubscriptions,
      paidOrders,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count({
        where: { role: { not: Role.SUPERADMIN } },
      }),
      prisma.order.count(),
      prisma.product.count(),
      prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.order.findMany({
        where: { paymentStatus: 'PAID' },
        select: { totalAmount: true },
      }),
    ]);

    // Calculate total revenue
    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    // Get monthly revenue (current month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: startOfMonth },
      },
      select: { totalAmount: true },
    });

    const monthlyRevenue = monthlyOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    // Get recent tenants
    const recentTenants = await prisma.tenant.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            orders: true,
          },
        },
      },
    });

    return NextResponse.json({
      totalTenants,
      totalUsers,
      totalOrders,
      totalProducts,
      totalSubscriptions,
      totalRevenue,
      monthlyRevenue,
      recentTenants,
    });
  } catch (error) {
    console.error('Error fetching global analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
