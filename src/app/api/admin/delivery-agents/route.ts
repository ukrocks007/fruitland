import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import { getTenantBySlug, validateTenantAccess } from '@/lib/tenant';

// GET - Get all delivery agents with their order counts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant slug from query params
    const tenantSlug = request.nextUrl.searchParams.get('tenantSlug');
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant slug required' }, { status: 400 });
    }

    // Validate tenant exists
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Validate tenant access
    if (!validateTenantAccess(session.user.role, session.user.tenantId, tenant.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const deliveryAgents = await prisma.user.findMany({
      where: {
        role: Role.DELIVERY_PARTNER,
        tenantId: tenant.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            assignedOrders: true,
          },
        },
        assignedOrders: {
          where: {
            tenantId: tenant.id,
            status: {
              notIn: ['DELIVERED', 'CANCELLED'],
            },
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to include active orders count
    const agents = deliveryAgents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      createdAt: agent.createdAt,
      totalOrders: agent._count.assignedOrders,
      activeOrders: agent.assignedOrders.length,
    }));

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error fetching delivery agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery agents' },
      { status: 500 }
    );
  }
}
