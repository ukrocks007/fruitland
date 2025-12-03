import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';

/**
 * API endpoint to set active tenant for SUPERADMIN
 * POST /api/tenant/set-active
 * Body: { tenantId: string | null }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.SUPERADMIN) {
      return NextResponse.json(
        { error: 'Only SUPERADMIN can switch tenants' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tenantId } = body;

    // Validate tenantId if provided
    if (tenantId) {
      const { prisma } = await import('@/lib/prisma');
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
    }

    // Return success - the actual session update will be handled client-side
    // by updating the JWT token through NextAuth
    return NextResponse.json({
      success: true,
      activeTenantId: tenantId,
    });
  } catch (error) {
    console.error('Error setting active tenant:', error);
    return NextResponse.json(
      { error: 'Failed to set active tenant' },
      { status: 500 }
    );
  }
}
