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

    // Validate tenant if tenantSlug is provided
    if (tenantSlug) {
      const tenant = await getTenantBySlug(tenantSlug);
      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      
      // For non-SUPERADMIN users, validate they belong to the tenant via UserTenant table
      if (session.user.role !== Role.SUPERADMIN) {
        const userTenant = await prisma.userTenant.findUnique({
          where: {
            userId_tenantId: {
              userId: session.user.id,
              tenantId: tenant.id,
            },
          },
        });

        if (!userTenant) {
          return NextResponse.json(
            { error: 'User is not associated with this tenant' },
            { status: 403 }
          );
        }
      }
      
      where.tenantId = tenant.id;
    } else {
      // If no tenantSlug provided and not SUPERADMIN, return error
      if (session.user.role !== Role.SUPERADMIN) {
        return NextResponse.json(
          { error: 'tenantSlug is required' },
          { status: 400 }
        );
      }
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
