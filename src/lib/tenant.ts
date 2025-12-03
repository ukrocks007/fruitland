import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { Role } from '@/types';
import { prisma } from './prisma';
import { headers } from 'next/headers';

/**
 * Get the active tenant ID for the current session
 * For SUPERADMIN: reads from URL parameter 'tenantId', falls back to first tenant
 * For other roles: returns their tenantId
 */
export async function getActiveTenantId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }

  // SUPERADMIN can switch tenants via URL parameter
  if (session.user.role === Role.SUPERADMIN) {
    // Try to get tenantId from URL parameter
    try {
      const headersList = await headers();
      const referer = headersList.get('referer') || '';
      const url = new URL(referer || 'http://localhost');
      const tenantIdFromUrl = url.searchParams.get('tenantId');
      
      if (tenantIdFromUrl) {
        // Validate tenant exists
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantIdFromUrl },
        });
        if (tenant) {
          return tenant.id;
        }
      }
    } catch (error) {
      // If we can't parse URL or find tenant, fall through to default
      console.error('Error reading tenantId from URL:', error);
    }
    
    // Fallback to the first tenant in the database
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
 * Get the active tenant ID from request headers or searchParams
 * Use this in API routes and server components
 */
export async function getActiveTenantIdFromRequest(searchParams?: { tenantId?: string }): Promise<string | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }

  // SUPERADMIN can specify tenant via parameter
  if (session.user.role === Role.SUPERADMIN) {
    const tenantId = searchParams?.tenantId;
    
    if (tenantId) {
      // Validate tenant exists
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
        });
        if (tenant) {
          return tenant.id;
        }
      } catch (error) {
        console.error('Error validating tenant:', error);
      }
    }
    
    // Fallback to first tenant
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
