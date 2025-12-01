import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { analyzeCohorts } from '@/lib/analytics';
import { CohortApiResponse } from '@/types/analytics';

export async function GET(): Promise<NextResponse<CohortApiResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await analyzeCohorts();

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
