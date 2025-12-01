import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';

// GET - Get all delivery agents with their order counts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deliveryAgents = await prisma.user.findMany({
      where: {
        role: Role.DELIVERY_PARTNER,
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
