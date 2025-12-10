import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantBySlug } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantSlug');

    const where: any = { isActive: true };

    // If tenantSlug is provided, filter by tenant
    if (tenantSlug) {
      const tenant = await getTenantBySlug(tenantSlug);
      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      where.tenantId = tenant.id;
    }

    const packages = await prisma.subscriptionPackage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Error fetching subscription packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription packages' },
      { status: 500 }
    );
  }
}
