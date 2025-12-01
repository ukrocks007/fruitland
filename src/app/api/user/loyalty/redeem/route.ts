import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redeemLoyaltyPoints, getLoyaltySettings } from '@/lib/loyalty';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { points, orderId } = body;

    if (!points || typeof points !== 'number' || points <= 0) {
      return NextResponse.json(
        { error: 'Invalid points value' },
        { status: 400 }
      );
    }

    const settings = await getLoyaltySettings();
    
    if (points < settings.minRedeemablePoints) {
      return NextResponse.json(
        { error: `Minimum ${settings.minRedeemablePoints} points required to redeem` },
        { status: 400 }
      );
    }

    const result = await redeemLoyaltyPoints(session.user.id, points, orderId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      discount: result.discount,
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error('Error redeeming points:', error);
    return NextResponse.json(
      { error: 'Failed to redeem points' },
      { status: 500 }
    );
  }
}
