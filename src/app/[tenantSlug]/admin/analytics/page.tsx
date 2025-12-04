import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { AdminCharts } from '@/components/admin-charts';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

interface RecentOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  user: {
    email: string | null;
  };
}

interface TopProduct {
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
  } | null;
  totalSold: number;
}

const CACHE_KEY = 'dashboard_analytics';
const CACHE_TTL_MINUTES = 5; // Cache expires after 5 minutes

async function getCachedAnalytics() {
  try {
    const cached = await prisma.analyticsCache.findUnique({
      where: { key: CACHE_KEY },
    });

    if (cached && cached.expiresAt > new Date()) {
      return JSON.parse(cached.data);
    }
    return null;
  } catch {
    // Table might not exist yet, return null
    return null;
  }
}

async function setCachedAnalytics(data: object) {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);

    await prisma.analyticsCache.upsert({
      where: { key: CACHE_KEY },
      update: {
        data: JSON.stringify(data),
        expiresAt,
      },
      create: {
        key: CACHE_KEY,
        data: JSON.stringify(data),
        expiresAt,
      },
    });
  } catch {
    // Table might not exist yet, ignore
  }
}

async function getAnalytics() {
  try {
    // Check cache first
    const cached = await getCachedAnalytics();
    if (cached) {
      return cached;
    }

    const now = new Date();
    const startMonth = startOfMonth(now);
    const endMonth = endOfMonth(now);
    const sixMonthsAgo = startOfMonth(subMonths(now, 5));

    // Run independent queries in parallel for better performance
    const [
      activeSubscriptions,
      activeSubscriptionsData,
      ordersThisMonth,
      ordersData,
      totalCustomers,
      lowStockProducts,
      recentOrders,
      topProductsData,
      ordersByStatus,
      // Get all orders for the last 6 months in one query for revenue by month
      allRecentOrders,
      // Get subscription counts for growth
      allSubscriptionsForGrowth,
    ] = await Promise.all([
      // Active subscriptions count
      prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),
      // Active subscriptions for MRR
      prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        select: { totalAmount: true },
      }),
      // Orders this month
      prisma.order.count({
        where: {
          createdAt: { gte: startMonth, lte: endMonth },
        },
      }),
      // Revenue this month
      prisma.order.findMany({
        where: {
          createdAt: { gte: startMonth, lte: endMonth },
          paymentStatus: 'PAID',
        },
        select: { totalAmount: true },
      }),
      // Total customers
      prisma.user.count({
        where: { role: 'CUSTOMER' },
      }),
      // Low stock products
      prisma.product.count({
        where: { stock: { lte: 10 }, isAvailable: true },
      }),
      // Recent orders - include items and address for full data structure
      prisma.order.findMany({
        take: 10,
        include: {
          items: { include: { product: true } },
          address: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Top products
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      // Orders by status
      prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
      // All paid orders in last 6 months for revenue calculations
      prisma.order.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo },
          paymentStatus: 'PAID',
        },
        select: {
          totalAmount: true,
          createdAt: true,
          items: {
            include: {
              product: { select: { category: true } },
            },
          },
        },
      }),
      // All subscriptions for growth tracking
      prisma.subscription.findMany({
        where: {
          createdAt: { lte: endMonth },
          status: 'ACTIVE',
        },
        select: { createdAt: true },
      }),
    ]);

    const monthlyRecurringRevenue = activeSubscriptionsData.reduce(
      (sum, sub) => sum + sub.totalAmount,
      0
    );

    const revenueThisMonth = ordersData.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    // Get product details for top products in a single query
    const productIds = topProductsData.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    const topProducts = topProductsData.map(item => ({
      product: productMap.get(item.productId) || null,
      totalSold: item._sum.quantity || 0,
    }));

    // Calculate revenue by month from the fetched orders
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));

      const monthRevenue = allRecentOrders
        .filter(order => order.createdAt >= monthStart && order.createdAt <= monthEnd)
        .reduce((sum, order) => sum + order.totalAmount, 0);

      revenueByMonth.push({
        month: format(monthStart, 'MMM yyyy'),
        revenue: monthRevenue,
      });
    }

    const orderStatusData = ordersByStatus.map(item => ({
      status: item.status,
      count: item._count,
    }));

    // Calculate subscription growth from fetched data
    const subscriptionGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const monthEnd = endOfMonth(subMonths(now, i));

      const count = allSubscriptionsForGrowth.filter(
        sub => sub.createdAt <= monthEnd
      ).length;

      subscriptionGrowth.push({
        month: format(startOfMonth(subMonths(now, i)), 'MMM yyyy'),
        count,
      });
    }

    // Calculate revenue by category from the fetched orders
    const categoryRevenueMap = new Map<string, number>();
    allRecentOrders.forEach(order => {
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

    const analyticsData = {
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
    };

    // Cache the results
    await setCachedAnalytics(analyticsData);

    return analyticsData;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return null;
  }
}

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== Role.ADMIN) {
    redirect('/auth/signin');
  }

  const analytics = await getAnalytics();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <AdminNavigation />

        <h2 className="text-2xl font-semibold mb-6">Business Growth Analytics</h2>

        {analytics ? (
          <>
            {/* Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Active Subscriptions
                  </CardTitle>
                  <Package className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics.activeSubscriptions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Monthly Recurring Revenue
                  </CardTitle>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">₹{analytics.monthlyRecurringRevenue.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Orders This Month
                  </CardTitle>
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics.ordersThisMonth}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Customers
                  </CardTitle>
                  <Users className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics.totalCustomers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Revenue This Month
                  </CardTitle>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">₹{analytics.revenueThisMonth.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Low Stock Products
                  </CardTitle>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics.lowStockProducts}</div>
                  {analytics.lowStockProducts > 0 && (
                    <p className="text-xs text-red-600 mt-1">Needs attention</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders & Top Products */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest customer orders</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.recentOrders.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.recentOrders.slice(0, 5).map((order: RecentOrder) => (
                        <Link
                          href="/admin/orders"
                          key={order.id}
                          className="flex justify-between items-center border-b pb-2 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <div>
                            <p className="font-medium">{order.orderNumber}</p>
                            <p className="text-sm text-gray-600">{order.user.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{order.totalAmount.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">{order.status}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No recent orders</p>
                  )}
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Products</CardTitle>
                  <CardDescription>Best performing products</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.topProducts.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.topProducts
                        .filter((item: TopProduct) => item.product !== null)
                        .map((item: TopProduct) => (
                          <Link
                            href="/admin/products"
                            key={item.product!.id}
                            className="flex justify-between items-center border-b pb-2 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div>
                              <p className="font-medium">{item.product!.name}</p>
                              <p className="text-sm text-gray-600">₹{item.product!.price}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{item.totalSold} sold</p>
                              <p className="text-sm text-gray-600">Stock: {item.product!.stock}</p>
                            </div>
                          </Link>
                        ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No sales data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Analytics Charts */}
            <AdminCharts analytics={analytics} />
          </>
        ) : (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-gray-500">Failed to load analytics data</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
