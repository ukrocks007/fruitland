import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import { getLoyaltySettings, LOYALTY_CONFIG_KEYS, DEFAULT_LOYALTY_SETTINGS } from '@/lib/loyalty';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getLoyaltySettings();

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching loyalty settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loyalty settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      pointsPerRupee, 
      minRedeemablePoints, 
      pointValueInRupees,
      silverTierThreshold,
      goldTierThreshold,
    } = body;

    const configUpdates = [
      {
        key: LOYALTY_CONFIG_KEYS.POINTS_PER_RUPEE,
        value: String(pointsPerRupee ?? DEFAULT_LOYALTY_SETTINGS.POINTS_PER_RUPEE),
        label: 'Points Per Rupee',
        category: 'loyalty',
      },
      {
        key: LOYALTY_CONFIG_KEYS.MIN_REDEEMABLE_POINTS,
        value: String(minRedeemablePoints ?? DEFAULT_LOYALTY_SETTINGS.MIN_REDEEMABLE_POINTS),
        label: 'Minimum Redeemable Points',
        category: 'loyalty',
      },
      {
        key: LOYALTY_CONFIG_KEYS.POINT_VALUE_IN_RUPEES,
        value: String(pointValueInRupees ?? DEFAULT_LOYALTY_SETTINGS.POINT_VALUE_IN_RUPEES),
        label: 'Point Value in Rupees',
        category: 'loyalty',
      },
      {
        key: LOYALTY_CONFIG_KEYS.SILVER_TIER_THRESHOLD,
        value: String(silverTierThreshold ?? DEFAULT_LOYALTY_SETTINGS.SILVER_TIER_THRESHOLD),
        label: 'Silver Tier Threshold',
        category: 'loyalty',
      },
      {
        key: LOYALTY_CONFIG_KEYS.GOLD_TIER_THRESHOLD,
        value: String(goldTierThreshold ?? DEFAULT_LOYALTY_SETTINGS.GOLD_TIER_THRESHOLD),
        label: 'Gold Tier Threshold',
        category: 'loyalty',
      },
    ];

    const promises = configUpdates.map(({ key, value, label, category }) =>
      prisma.config.upsert({
        where: { key },
        update: { value },
        create: {
          key,
          value,
          label,
          type: 'number',
          category,
        },
      })
    );

    await Promise.all(promises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating loyalty settings:', error);
    return NextResponse.json(
      { error: 'Failed to update loyalty settings' },
      { status: 500 }
    );
  }
}
