import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantBySlug } from '@/lib/tenant';

// PATCH - Update subscription status (pause/resume/cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantSlug = request.nextUrl.searchParams.get('tenantSlug') || request.headers.get('x-tenant-slug') || undefined;
    if (!tenantSlug) {
      return NextResponse.json({ error: 'tenantSlug is required' }, { status: 400 });
    }
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Invalid tenantSlug' }, { status: 404 });
    }
    
    // Check if user is associated with this tenant via UserTenant table
    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: session.user.id,
          tenantId: tenant.id,
        },
      },
    });

    if (!userTenant) {
      return NextResponse.json({ error: 'User-tenant mismatch' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, pausedUntil } = body;

    const subscription = await prisma.subscription.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!subscription || subscription.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    let updateData: any = {};

    switch (action) {
      case 'pause':
        updateData = {
          status: 'PAUSED',
          pausedUntil: pausedUntil ? new Date(pausedUntil) : null,
        };
        break;
      case 'resume':
        updateData = {
          status: 'ACTIVE',
          pausedUntil: null,
        };
        break;
      case 'cancel':
        updateData = {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        };
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        address: true,
      },
    });

    return NextResponse.json(updatedSubscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
