import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserLoyaltyInfo, getLoyaltySettings } from '@/lib/loyalty';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const [loyaltyInfo, settings] = await Promise.all([
      getUserLoyaltyInfo(session.user.id, limit),
      getLoyaltySettings(),
    ]);

    return NextResponse.json({
      ...loyaltyInfo,
      settings,
    });
  } catch (error) {
    console.error('Error fetching loyalty info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loyalty information' },
      { status: 500 }
    );
  }
}
