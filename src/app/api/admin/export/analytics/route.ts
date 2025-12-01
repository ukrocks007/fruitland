import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import {
  convertToCSV,
  formatAnalyticsForExport,
  ANALYTICS_CSV_HEADERS,
} from '@/lib/export';

/**
 * GET /api/admin/export/analytics
 * Export analytics data (sales summary per month, top products, subscription summary) to CSV
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const sixMonthsAgo = startOfMonth(subMonths(now, 5));

    // Fetch all data needed for analytics
    const [allOrders, topProductsData, allSubscriptions] = await Promise.all([
      // All paid orders in last 6 months
      prisma.order.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo },
          paymentStatus: 'PAID',
        },
        select: {
          totalAmount: true,
          createdAt: true,
        },
      }),
      // Top products by quantity sold
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      // All active subscriptions
      prisma.subscription.findMany({
        where: {
          createdAt: { lte: endOfMonth(now) },
          status: 'ACTIVE',
        },
        select: { createdAt: true },
      }),
    ]);

    // Get product details for top products
    const productIds = topProductsData.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const topProducts = topProductsData.map((item) => ({
      product: productMap.get(item.productId) || null,
      totalSold: item._sum.quantity || 0,
    }));

    // Calculate revenue and orders by month
    const revenueByMonth: Array<{ month: string; revenue: number }> = [];
    const ordersByMonth: Array<{ month: string; count: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));

      const monthOrders = allOrders.filter(
        (order) => order.createdAt >= monthStart && order.createdAt <= monthEnd
      );

      const monthRevenue = monthOrders.reduce(
        (sum, order) => sum + order.totalAmount,
        0
      );

      revenueByMonth.push({
        month: format(monthStart, 'MMM yyyy'),
        revenue: monthRevenue,
      });

      ordersByMonth.push({
        month: format(monthStart, 'MMM yyyy'),
        count: monthOrders.length,
      });
    }

    // Calculate subscription growth
    const subscriptionGrowth: Array<{ month: string; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthEnd = endOfMonth(subMonths(now, i));

      const count = allSubscriptions.filter(
        (sub) => sub.createdAt <= monthEnd
      ).length;

      subscriptionGrowth.push({
        month: format(startOfMonth(subMonths(now, i)), 'MMM yyyy'),
        count,
      });
    }

    // Format data for export
    const analyticsData = {
      revenueByMonth,
      ordersByMonth,
      topProducts,
      subscriptionGrowth,
    };

    const exportData = formatAnalyticsForExport(analyticsData);

    // Convert to CSV
    const csv = convertToCSV(exportData, ANALYTICS_CSV_HEADERS);

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `analytics-export-${dateStr}.csv`;

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting analytics:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics' },
      { status: 500 }
    );
  }
}
