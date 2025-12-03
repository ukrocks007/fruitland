import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { Role } from '@/types';
import { prisma } from './prisma';

/**
 * Get the active tenant ID for the current session
 * For SUPERADMIN: returns activeTenantId if set, otherwise falls back to first tenant
 * For other roles: returns their tenantId
 */
export async function getActiveTenantId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }

  // SUPERADMIN can switch tenants via activeTenantId
  if (session.user.role === Role.SUPERADMIN) {
    // If activeTenantId is set, use it
    if (session.user.activeTenantId) {
      return session.user.activeTenantId;
    }
    
    // Otherwise, fallback to the first tenant in the database
    try {
      const firstTenant = await prisma.tenant.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      return firstTenant?.id || null;
    } catch (error) {
      console.error('Error fetching first tenant:', error);
      return null;
    }
  }

  // All other roles use their fixed tenantId
  return session.user.tenantId || null;
}

/**
 * Check if the current user is a SUPERADMIN
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return session?.user?.role === Role.SUPERADMIN;
}

/**
 * Get tenant ID, throwing error if not available
 * Use this in routes that require a tenant
 */
export async function requireTenantId(): Promise<string> {
  const tenantId = await getActiveTenantId();
  
  if (!tenantId) {
    throw new Error('Tenant ID is required for this operation');
  }
  
  return tenantId;
}

/**
 * Check if user has access to a specific tenant
 */
export async function hasAccessToTenant(tenantId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return false;
  }

  // SUPERADMIN has access to all tenants
  if (session.user.role === Role.SUPERADMIN) {
    return true;
  }

  // Other users can only access their own tenant
  return session.user.tenantId === tenantId;
}

/**
 * Get user's fixed tenant ID (not activeTenantId)
 * Use this for user-specific operations
 */
export async function getUserTenantId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.tenantId || null;
}
