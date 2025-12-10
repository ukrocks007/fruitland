import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import { getTenantBySlug } from '@/lib/tenant';

// GET - Get orders assigned to the delivery partner
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.DELIVERY_PARTNER) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant slug from query params
    const tenantSlug = request.nextUrl.searchParams.get('tenantSlug');
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant slug is required' }, { status: 400 });
    }

    // Validate tenant
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 404 });
    }

    // Check if delivery partner is associated with this tenant via UserTenant table
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
        { error: 'Delivery partner is not associated with this tenant' },
        { status: 403 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        deliveryPartnerId: session.user.id,
        tenantId: tenant.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        address: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
