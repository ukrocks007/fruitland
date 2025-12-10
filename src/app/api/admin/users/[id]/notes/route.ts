import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import { getTenantBySlug } from '@/lib/tenant';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantSlug') || request.headers.get('x-tenant-slug') || undefined;
    let scopeTenantId: string | undefined = undefined;
    if (session.user.role === Role.ADMIN) {
      scopeTenantId = session.user.tenantId ?? undefined;
    } else if (session.user.role === Role.SUPERADMIN && tenantSlug) {
      const tenant = await getTenantBySlug(tenantSlug);
      scopeTenantId = tenant?.id;
    }

    const notes = await prisma.customerNote.findMany({
      where: scopeTenantId ? { userId: id, user: { tenantId: scopeTenantId } } : { userId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantSlug') || request.headers.get('x-tenant-slug') || undefined;
    let scopeTenantId: string | undefined = undefined;
    if (session.user.role === Role.ADMIN) {
      scopeTenantId = session.user.tenantId ?? undefined;
    } else if (session.user.role === Role.SUPERADMIN && tenantSlug) {
      const tenant = await getTenantBySlug(tenantSlug);
      scopeTenantId = tenant?.id;
    }
    const { note } = body;

    if (!note) {
      return NextResponse.json({ error: 'Note is required' }, { status: 400 });
    }

    // Optional guard: ensure target user is within scope
    if (scopeTenantId) {
      const target = await prisma.user.findFirst({ where: { id, tenantId: scopeTenantId } });
      if (!target) {
        return NextResponse.json({ error: 'User not in tenant scope' }, { status: 403 });
      }
    }

    const customerNote = await prisma.customerNote.create({
      data: {
        userId: id,
        createdBy: session.user.id,
        note,
      },
    });

    return NextResponse.json({ note: customerNote });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
