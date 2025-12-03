import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';

/**
 * GET /api/superadmin/tenants - List all tenants (SUPERADMIN only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.SUPERADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            products: true,
            orders: true,
            subscriptions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/tenants - Create a new tenant (SUPERADMIN only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.SUPERADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, domain } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    if (slug) {
      const existing = await prisma.tenant.findUnique({
        where: { slug },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 400 }
        );
      }
    }

    // Check if domain already exists
    if (domain) {
      const existing = await prisma.tenant.findUnique({
        where: { domain },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Domain already exists' },
          { status: 400 }
        );
      }
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug: slug || null,
        domain: domain || null,
      },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
