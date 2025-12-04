import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SuperadminLogout from '@/components/SuperadminLogout';
import { Building2, Users, Package, ShoppingCart } from 'lucide-react';

export default async function SuperAdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'SUPERADMIN') {
    redirect('/auth/signin');
  }

  // Get all tenants
  const tenants = await prisma.tenant.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          users: true,
          products: true,
          orders: true,
        },
      },
    },
  });

  // Get overall stats
  const totalUsers = await prisma.user.count();
  const totalOrders = await prisma.order.count();
  const totalProducts = await prisma.product.count();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Superadmin Dashboard</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Logged in as: {session.user.email}
              </div>
              <SuperadminLogout />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Tenants</p>
                <p className="text-3xl font-bold">{tenants.length}</p>
              </div>
              <Building2 className="h-12 w-12 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold">{totalUsers}</p>
              </div>
              <Users className="h-12 w-12 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Products</p>
                <p className="text-3xl font-bold">{totalProducts}</p>
              </div>
              <Package className="h-12 w-12 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-3xl font-bold">{totalOrders}</p>
              </div>
              <ShoppingCart className="h-12 w-12 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Tenants List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Tenants</h2>
              <Link href="/superadmin/tenants/new">
                <Button>Add New Tenant</Button>
              </Link>
            </div>
          </div>
          
          <div className="divide-y">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{tenant.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        tenant.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tenant.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Slug: <span className="font-mono">{tenant.slug}</span>
                    </p>
                    {tenant.description && (
                      <p className="text-sm text-gray-600 mb-3">{tenant.description}</p>
                    )}
                    <div className="flex gap-6 text-sm text-gray-600">
                      <span>{tenant._count.users} users</span>
                      <span>{tenant._count.products} products</span>
                      <span>{tenant._count.orders} orders</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/${tenant.slug}`} target="_blank">
                      <Button variant="outline" size="sm">
                        View Storefront
                      </Button>
                    </Link>
                    <Link href={`/${tenant.slug}/admin`}>
                      <Button size="sm">
                        Admin Panel
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
