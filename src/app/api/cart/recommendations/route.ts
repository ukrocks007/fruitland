import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCartRecommendations } from '@/lib/recommendations';
import { getTenantBySlug } from '@/lib/tenant';

export async function POST(request: NextRequest) {
  try {
    const tenantSlug = request.nextUrl.searchParams.get('tenantSlug') || request.headers.get('x-tenant-slug') || undefined;
    if (!tenantSlug) {
      return NextResponse.json({ error: 'tenantSlug is required' }, { status: 400 });
    }
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Invalid tenantSlug' }, { status: 404 });
    }
    const body = await request.json();
    const { productIds, limit = 6 } = body;

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'productIds array is required' },
        { status: 400 }
      );
    }

    // Get user session for personalized recommendations
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    const recommendations = await getCartRecommendations(productIds, {
      limit,
      userId,
      tenantId: tenant.id,
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Error fetching cart recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
