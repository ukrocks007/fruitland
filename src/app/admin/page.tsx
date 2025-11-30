import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/navbar';
import Link from 'next/link';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  LayoutDashboard,
  Settings
} from 'lucide-react';
import { AdminCharts } from '@/components/admin-charts';

async function getAnalytics() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/admin/analytics`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return null;
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return null;
  }
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== Role.ADMIN) {
    redirect('/auth/signin');
  }

  const analytics = await getAnalytics();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <Button variant="outline" asChild className="justify-start sm:justify-center">
              <Link href="/admin/orders">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Orders
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start sm:justify-center">
              <Link href="/admin/subscriptions">
                <Package className="w-4 h-4 mr-2" />
                Subscriptions
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start sm:justify-center">
              <Link href="/admin/subscription-packages">
                <Package className="w-4 h-4 mr-2" />
                Packages
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start sm:justify-center">
              <Link href="/admin/users">
                <Users className="w-4 h-4 mr-2" />
                Users
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start sm:justify-center">
              <Link href="/admin/products">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Products
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start sm:justify-center">
              <Link href="/admin/settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </Button>
          </div>
        </div>
        
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

            {/* Recent Orders */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest customer orders</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.recentOrders.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.recentOrders.slice(0, 5).map((order: any) => (
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
                      {analytics.topProducts.map((item: any) => (
                        <div key={item.product.id} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-gray-600">₹{item.product.price}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{item.totalSold} sold</p>
                            <p className="text-sm text-gray-600">Stock: {item.product.stock}</p>
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
