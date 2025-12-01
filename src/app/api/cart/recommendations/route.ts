import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCartRecommendations } from '@/lib/recommendations';

export async function POST(request: NextRequest) {
  try {
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
