import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { getTenantBySlug } from '@/lib/tenant';

// GET orders - user's own orders or all orders (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const tenantSlug = searchParams.get('tenantSlug');

    const where: any = {};

    // Get user's tenantId for regular users
    if (!session.user.tenantId && session.user.role !== Role.SUPERADMIN) {
      return NextResponse.json(
        { error: 'User is not associated with a tenant' },
        { status: 400 }
      );
    }

    // Validate tenant if tenantSlug is provided
    if (tenantSlug) {
      const tenant = await getTenantBySlug(tenantSlug);
      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      // For non-SUPERADMIN users, validate they belong to the tenant
      if (session.user.role !== Role.SUPERADMIN && tenant.id !== session.user.tenantId) {
        return NextResponse.json(
          { error: 'Invalid tenant' },
          { status: 403 }
        );
      }
      where.tenantId = tenant.id;
    } else if (session.user.tenantId) {
      // Default to user's tenant if no tenantSlug provided
      where.tenantId = session.user.tenantId;
    }

    // If not admin, only show user's own orders
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN) {
      where.userId = session.user.id;
    }

    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
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

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
