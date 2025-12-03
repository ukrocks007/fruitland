import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { calculateSummary, calculateRFM } from '@/lib/analytics';
import { SummaryApiResponse, RFMSummary } from '@/types/analytics';
import { getActiveTenantId } from '@/lib/tenant';

export interface ExtendedSummaryApiResponse extends Omit<SummaryApiResponse, 'data'> {
  data?: SummaryApiResponse['data'] & {
    rfm?: RFMSummary;
  };
}

export async function GET(): Promise<NextResponse<ExtendedSummaryApiResponse>> {
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

    const [summary, rfm] = await Promise.all([
      calculateSummary(tenantId),
      calculateRFM(tenantId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        rfm,
      },
    });
  } catch (error) {
    console.error('Error fetching summary data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch summary data' },
      { status: 500 }
    );
  }
}
