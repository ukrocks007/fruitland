import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const startMonth = startOfMonth(now);
    const endMonth = endOfMonth(now);

    // Active subscriptions
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: 'ACTIVE' },
    });

    // Monthly recurring revenue
    const activeSubscriptionsData = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      select: { totalAmount: true },
    });
    const monthlyRecurringRevenue = activeSubscriptionsData.reduce(
      (sum, sub) => sum + sub.totalAmount,
      0
    );

    // Orders this month
    const ordersThisMonth = await prisma.order.count({
      where: {
        createdAt: {
          gte: startMonth,
          lte: endMonth,
        },
      },
    });

    // Revenue this month
    const ordersData = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startMonth,
          lte: endMonth,
        },
        paymentStatus: 'PAID',
      },
      select: { totalAmount: true },
    });
    const revenueThisMonth = ordersData.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    // Total customers
    const totalCustomers = await prisma.user.count({
      where: { role: 'CUSTOMER' },
    });

    // Low stock products
    const lowStockProducts = await prisma.product.count({
      where: {
        stock: {
          lte: 10,
        },
        isAvailable: true,
      },
    });

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      take: 10,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        address: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Top products
    const topProductsData = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    const topProducts = await Promise.all(
      topProductsData.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        return {
          product,
          totalSold: item._sum.quantity || 0,
        };
      })
    );

    // Revenue by month (last 6 months)
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
          paymentStatus: 'PAID',
        },
        select: { totalAmount: true },
      });

      const revenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      
      revenueByMonth.push({
        month: format(monthStart, 'MMM yyyy'),
        revenue,
      });
    }

    // Orders by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    const orderStatusData = ordersByStatus.map(item => ({
      status: item.status,
      count: item._count,
    }));

    // Subscription growth (last 6 months)
    const subscriptionGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const count = await prisma.subscription.count({
        where: {
          createdAt: {
            lte: monthEnd,
          },
          status: 'ACTIVE',
        },
      });

      subscriptionGrowth.push({
        month: format(monthStart, 'MMM yyyy'),
        count,
      });
    }

    // Revenue by category
    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const categoryRevenueMap = new Map<string, number>();
    orders.forEach(order => {
      order.items.forEach(item => {
        const category = item.product.category;
        const revenue = item.price * item.quantity;
        categoryRevenueMap.set(
          category,
          (categoryRevenueMap.get(category) || 0) + revenue
        );
      });
    });

    const categoryRevenue = Array.from(categoryRevenueMap.entries()).map(([category, revenue]) => ({
      category,
      revenue,
    }));

    return NextResponse.json({
      activeSubscriptions,
      monthlyRecurringRevenue,
      ordersThisMonth,
      totalCustomers,
      revenueThisMonth,
      lowStockProducts,
      recentOrders,
      topProducts,
      revenueByMonth,
      ordersByStatus: orderStatusData,
      subscriptionGrowth,
      categoryRevenue,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
