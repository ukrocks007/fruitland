import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import { getTenantBySlug } from '@/lib/tenant';

export async function PATCH(
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
    const { role } = body;

    if (!role || !['CUSTOMER', 'ADMIN', 'DELIVERY_PARTNER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: scopeTenantId ? { id, tenantId: scopeTenantId } : { id },
      data: { role },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await prisma.user.delete({
      where: scopeTenantId ? { id, tenantId: scopeTenantId } : { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
