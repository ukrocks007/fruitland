import { redirect } from 'next/navigation';
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

async function getAnalytics() {
  try {
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
    const allOrders = await prisma.order.findMany({
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
    allOrders.forEach(order => {
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

    return {
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
                        <div key={order.id} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="font-medium">{order.orderNumber}</p>
                            <p className="text-sm text-gray-600">{order.user.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{order.totalAmount.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">{order.status}</p>
                          </div>
                        </div>
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
                        <div key={item.product!.id} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="font-medium">{item.product!.name}</p>
                            <p className="text-sm text-gray-600">₹{item.product!.price}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{item.totalSold} sold</p>
                            <p className="text-sm text-gray-600">Stock: {item.product!.stock}</p>
                          </div>
                        </div>
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
