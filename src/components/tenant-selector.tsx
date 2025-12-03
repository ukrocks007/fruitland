'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Role } from '@/types';

interface Tenant {
  id: string;
  name: string;
  slug: string | null;
}

export function TenantSelector() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Only show for SUPERADMIN
  if (!session || session.user.role !== Role.SUPERADMIN) {
    return null;
  }

  useEffect(() => {
    fetchTenants();
    // Get current active tenant from session
    if (session?.user?.activeTenantId) {
      setSelectedTenantId(session.user.activeTenantId);
    }
  }, [session]);

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/superadmin/tenants');
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const handleTenantChange = async (tenantId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/tenant/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenantId || null }),
      });

      if (response.ok) {
        setSelectedTenantId(tenantId);
        // Refresh the page to apply the new tenant context
        router.refresh();
      }
    } catch (error) {
      console.error('Error setting tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
      <span className="text-sm font-medium text-purple-900">
        🔐 Viewing Tenant:
      </span>
      <select
        value={selectedTenantId || ''}
        onChange={(e) => handleTenantChange(e.target.value)}
        disabled={loading}
        className="px-3 py-1 text-sm border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white disabled:opacity-50"
      >
        <option value="">Select a tenant...</option>
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name} {tenant.slug ? `(${tenant.slug})` : ''}
          </option>
        ))}
      </select>
      {loading && (
        <span className="text-xs text-purple-600">Loading...</span>
      )}
    </div>
  );
}
