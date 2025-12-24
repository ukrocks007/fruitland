import { prisma } from './prisma';
import { Tenant } from '@/types';
import { cache } from 'react';

// Cache for tenant lookups (5 minutes TTL in production)
const tenantCache = new Map<string, { tenant: Tenant | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get tenant by slug with caching
 */
export const getTenantBySlug = cache(async (slug: string): Promise<Tenant | null> => {
  // Check cache first
  const cached = tenantCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.tenant;
  }

  // Fetch from database
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logo: true,
      contactEmail: true,
      contactPhone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Update cache
  tenantCache.set(slug, { tenant, timestamp: Date.now() });

  return tenant;
});

/**
 * Get tenant by ID with caching
 */
export const getTenantById = cache(async (id: string): Promise<Tenant | null> => {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logo: true,
      contactEmail: true,
      contactPhone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return tenant;
});

/**
 * Validate tenant exists and is active
 * Throws error if tenant not found or inactive
 */
export async function requireTenantBySlug(slug: string): Promise<Tenant> {
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    throw new Error(`Tenant not found: ${slug}`);
  }

  if (!tenant.isActive) {
    throw new Error(`Tenant is not active: ${slug}`);
  }

  return tenant;
}

/**
 * Get all active tenants
 */
export async function getActiveTenants(): Promise<Tenant[]> {
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logo: true,
      contactEmail: true,
      contactPhone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return tenants;
}

/**
 * Resolve effective tenant ID from session or path
 * For SUPERADMIN: returns activeTenantId if set, otherwise null
 * For other roles: returns session.tenantId
 */
export function resolveTenantId(
  session: { user: { role: string; tenantId?: string | null; activeTenantId?: string | null } } | null,
  tenantSlug?: string
): string | null {
  if (!session) return null;

  const { role, tenantId, activeTenantId } = session.user;

  // SUPERADMIN can switch tenants
  if (role === 'SUPERADMIN') {
    return activeTenantId || null;
  }

  // Other roles use their assigned tenant
  return tenantId || null;
}

/**
 * Clear tenant cache (useful for testing or after tenant updates)
 */
export function clearTenantCache(slug?: string) {
  if (slug) {
    tenantCache.delete(slug);
  } else {
    tenantCache.clear();
  }
}

/**
 * Validate user has access to tenant
 * SUPERADMIN can access any tenant
 * Other roles can only access their assigned tenant
 */
export function validateTenantAccess(
  userRole: string,
  userTenantId: string | null | undefined,
  targetTenantId: string
): boolean {
  if (userRole === 'SUPERADMIN') {
    return true;
  }

  return userTenantId === targetTenantId;
}

/**
 * Get default tenant slug from environment
 */
export function getDefaultTenantSlug(): string {
  return process.env.DEFAULT_TENANT_SLUG || 'fruitland';
}

/**
 * Ensure a CUSTOMER has a membership record for the given tenant.
 * Safe no-op if the membership delegate is not available yet.
 */
export async function ensureCustomerMembership(userId: string, tenantId: string, role: string) {
  try {
    if (role !== 'CUSTOMER') return;
    const client: any = prisma as any;
    if (!client.userTenant) return;
    await client.userTenant.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      update: {},
      create: { userId, tenantId, role: 'CUSTOMER' },
    });
  } catch (e) {
    // Swallow to avoid breaking flows; log for diagnostics
    console.warn('ensureCustomerMembership failed:', e);
  }
}
