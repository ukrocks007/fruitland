'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  domain: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    products: number;
    orders: number;
    subscriptions: number;
  };
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    domain: '',
  });
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const { update } = useSession();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/superadmin/tenants');
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/superadmin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTenant.name,
          slug: newTenant.slug || undefined,
          domain: newTenant.domain || undefined,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewTenant({ name: '', slug: '', domain: '' });
        fetchTenants();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create tenant');
      }
    } catch (error) {
      console.error('Error creating tenant:', error);
      alert('Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const handleViewTenant = async (tenantId: string) => {
    try {
      // Set active tenant in session
      await update({ activeTenantId: tenantId });
      
      // Navigate to admin portal
      router.push('/admin');
    } catch (error) {
      console.error('Error setting active tenant:', error);
      alert('Failed to switch to tenant view');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading tenants...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          + Create Tenant
        </button>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {tenant.name}
                </h3>
                {tenant.slug && (
                  <p className="text-sm text-gray-500 mt-1">/{tenant.slug}</p>
                )}
              </div>
              <button
                onClick={() => handleViewTenant(tenant.id)}
                className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              >
                View
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Users:</span>
                <span className="font-medium text-gray-900">
                  {tenant._count.users}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Products:</span>
                <span className="font-medium text-gray-900">
                  {tenant._count.products}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Orders:</span>
                <span className="font-medium text-gray-900">
                  {tenant._count.orders}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subscriptions:</span>
                <span className="font-medium text-gray-900">
                  {tenant._count.subscriptions}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Created: {new Date(tenant.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Create New Tenant
            </h2>
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTenant.name}
                  onChange={(e) =>
                    setNewTenant({ ...newTenant, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Acme Corporation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (optional)
                </label>
                <input
                  type="text"
                  value={newTenant.slug}
                  onChange={(e) =>
                    setNewTenant({ ...newTenant, slug: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., acme"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used for subdomain routing (future feature)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain (optional)
                </label>
                <input
                  type="text"
                  value={newTenant.domain}
                  onChange={(e) =>
                    setNewTenant({ ...newTenant, domain: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., acme.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Custom domain for this tenant (future feature)
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
