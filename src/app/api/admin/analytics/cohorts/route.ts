import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { analyzeCohorts } from '@/lib/analytics';
import { CohortApiResponse } from '@/types/analytics';
import { getActiveTenantId } from '@/lib/tenant';

export async function GET(): Promise<NextResponse<CohortApiResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = await getActiveTenantId();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const data = await analyzeCohorts(tenantId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching cohort data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cohort data' },
      { status: 500 }
    );
  }
}
