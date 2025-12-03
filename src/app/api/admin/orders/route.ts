import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import { getActiveTenantId } from '@/lib/tenant';

// GET all orders (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active tenant ID
    const tenantId = await getActiveTenantId();
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required. Please select a tenant.' },
        { status: 400 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        tenantId,
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
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
