'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Tenant, TenantContextType } from '@/types';

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isLoading: true,
});

export function useTenant() {
  return useContext(TenantContext);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const pathname = usePathname();

  useEffect(() => {
    async function loadTenant() {
      try {
        setIsLoading(true);
        setError(undefined);

        // Extract tenant slug from pathname
        const segments = pathname.split('/').filter(Boolean);
        const tenantSlug = segments[0];

        // Skip if no tenant slug or if it's an API route
        if (!tenantSlug || pathname.startsWith('/api/')) {
          setTenant(null);
          setIsLoading(false);
          return;
        }

        // Skip for auth, admin, superadmin routes at root level
        if (['auth', 'admin', 'superadmin'].includes(tenantSlug)) {
          setTenant(null);
          setIsLoading(false);
          return;
        }

        // Fetch tenant data
        const response = await fetch(`/api/tenants/${tenantSlug}`);
        if (!response.ok) {
          throw new Error('Tenant not found');
        }

        const data = await response.json();
        setTenant(data.tenant);
      } catch (err) {
        console.error('Error loading tenant:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tenant');
        setTenant(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadTenant();
  }, [pathname]);

  return (
    <TenantContext.Provider value={{ tenant, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook for tenant-aware API calls
 * Automatically adds tenantId to request headers
 */
export function useTenantAwareFetch() {
  const { tenant } = useTenant();

  return async function tenantAwareFetch(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);

    if (tenant) {
      headers.set('X-Tenant-Id', tenant.id);
      headers.set('X-Tenant-Slug', tenant.slug);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };
}

/**
 * Extract tenant slug from pathname
 */
export function getTenantSlugFromPathname(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  
  // Check if first segment looks like a tenant slug
  if (segments.length > 0) {
    const firstSegment = segments[0];
    
    // Skip known root routes
    if (['api', 'auth', 'admin', 'superadmin', '_next'].includes(firstSegment)) {
      return null;
    }
    
    return firstSegment;
  }
  
  return null;
}
