import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { calculateCLV } from '@/lib/analytics';
import { CLVApiResponse } from '@/types/analytics';

export async function GET(): Promise<NextResponse<CLVApiResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await calculateCLV();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching CLV data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch CLV data' },
      { status: 500 }
    );
  }
}
