import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import { getTenantBySlug } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantSlug') || request.headers.get('x-tenant-slug') || undefined;

    // Determine tenant scope
    let tenantId: string | undefined = undefined;
    if (session.user.role === Role.ADMIN) {
      tenantId = session.user.tenantId ?? undefined;
    } else if (session.user.role === Role.SUPERADMIN) {
      if (tenantSlug) {
        const tenant = await getTenantBySlug(tenantSlug);
        tenantId = tenant?.id;
      }
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            subscriptions: true,
          },
        },
      },
      where: tenantId ? { tenantId } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
