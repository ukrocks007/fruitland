import { prisma } from './prisma';
import { LoyaltyTier, LoyaltyTransactionType } from '@/types';

// Default loyalty settings
export const DEFAULT_LOYALTY_SETTINGS = {
  POINTS_PER_RUPEE: 0.01, // 0.01 points per rupee = 1 point per ₹100 spent
  MIN_REDEEMABLE_POINTS: 100, // Minimum points required to redeem
  POINT_VALUE_IN_RUPEES: 1, // 1 point = ₹1 when redeeming (must be > 0)
  SILVER_TIER_THRESHOLD: 500, // Points needed for Silver tier
  GOLD_TIER_THRESHOLD: 2000, // Points needed for Gold tier
};

// Config keys for loyalty settings
export const LOYALTY_CONFIG_KEYS = {
  POINTS_PER_RUPEE: 'LOYALTY_POINTS_PER_RUPEE',
  MIN_REDEEMABLE_POINTS: 'LOYALTY_MIN_REDEEMABLE_POINTS',
  POINT_VALUE_IN_RUPEES: 'LOYALTY_POINT_VALUE_IN_RUPEES',
  SILVER_TIER_THRESHOLD: 'LOYALTY_SILVER_TIER_THRESHOLD',
  GOLD_TIER_THRESHOLD: 'LOYALTY_GOLD_TIER_THRESHOLD',
};

/**
 * Fetches loyalty settings from the database config
 */
export async function getLoyaltySettings() {
  const configs = await prisma.config.findMany({
    where: {
      key: { in: Object.values(LOYALTY_CONFIG_KEYS) },
    },
  });

  const configMap = new Map(configs.map(c => [c.key, c.value]));

  return {
    pointsPerRupee: parseFloat(configMap.get(LOYALTY_CONFIG_KEYS.POINTS_PER_RUPEE) || String(DEFAULT_LOYALTY_SETTINGS.POINTS_PER_RUPEE)),
    minRedeemablePoints: parseInt(configMap.get(LOYALTY_CONFIG_KEYS.MIN_REDEEMABLE_POINTS) || String(DEFAULT_LOYALTY_SETTINGS.MIN_REDEEMABLE_POINTS), 10),
    pointValueInRupees: parseFloat(configMap.get(LOYALTY_CONFIG_KEYS.POINT_VALUE_IN_RUPEES) || String(DEFAULT_LOYALTY_SETTINGS.POINT_VALUE_IN_RUPEES)),
    silverTierThreshold: parseInt(configMap.get(LOYALTY_CONFIG_KEYS.SILVER_TIER_THRESHOLD) || String(DEFAULT_LOYALTY_SETTINGS.SILVER_TIER_THRESHOLD), 10),
    goldTierThreshold: parseInt(configMap.get(LOYALTY_CONFIG_KEYS.GOLD_TIER_THRESHOLD) || String(DEFAULT_LOYALTY_SETTINGS.GOLD_TIER_THRESHOLD), 10),
  };
}

/**
 * Calculates points to be earned based on order amount
 */
export function calculatePointsToEarn(orderAmount: number, pointsPerRupee: number): number {
  return Math.floor(orderAmount * pointsPerRupee);
}

/**
 * Calculates discount amount from points
 */
export function calculateDiscountFromPoints(points: number, pointValueInRupees: number): number {
  return points * pointValueInRupees;
}

/**
 * Determines the loyalty tier based on total points earned
 */
export function determineLoyaltyTier(
  totalPointsEarned: number, 
  silverThreshold: number, 
  goldThreshold: number
): string {
  if (totalPointsEarned >= goldThreshold) {
    return LoyaltyTier.GOLD;
  } else if (totalPointsEarned >= silverThreshold) {
    return LoyaltyTier.SILVER;
  }
  return LoyaltyTier.BASIC;
}

/**
 * Awards loyalty points to a user after order completion
 */
export async function awardLoyaltyPoints(
  userId: string, 
  orderId: string, 
  orderAmount: number
): Promise<{ pointsEarned: number; newBalance: number; newTier: string }> {
  const settings = await getLoyaltySettings();
  const pointsEarned = calculatePointsToEarn(orderAmount, settings.pointsPerRupee);

  if (pointsEarned <= 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true, loyaltyTier: true },
    });
    return {
      pointsEarned: 0,
      newBalance: user?.pointsBalance || 0,
      newTier: user?.loyaltyTier || LoyaltyTier.BASIC,
    };
  }

  // Get user's total earned points (for tier calculation)
  const totalEarned = await prisma.loyaltyTransaction.aggregate({
    where: {
      userId,
      type: LoyaltyTransactionType.EARN,
    },
    _sum: {
      points: true,
    },
  });

  const newTotalEarned = (totalEarned._sum.points || 0) + pointsEarned;
  const newTier = determineLoyaltyTier(newTotalEarned, settings.silverTierThreshold, settings.goldTierThreshold);

  // Update user's points and tier, create transaction
  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        pointsBalance: { increment: pointsEarned },
        loyaltyTier: newTier,
      },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        userId,
        orderId,
        type: LoyaltyTransactionType.EARN,
        points: pointsEarned,
        description: `Earned ${pointsEarned} points for order`,
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { pointsEarned },
    }),
  ]);

  return {
    pointsEarned,
    newBalance: user.pointsBalance,
    newTier: user.loyaltyTier,
  };
}

/**
 * Redeems loyalty points for a discount
 */
export async function redeemLoyaltyPoints(
  userId: string,
  pointsToRedeem: number,
  orderId?: string
): Promise<{ success: boolean; discount: number; newBalance: number; error?: string }> {
  const settings = await getLoyaltySettings();
  
  // Validate minimum redeemable points
  if (pointsToRedeem < settings.minRedeemablePoints) {
    return {
      success: false,
      discount: 0,
      newBalance: 0,
      error: `Minimum ${settings.minRedeemablePoints} points required to redeem`,
    };
  }

  // Get current balance
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pointsBalance: true },
  });

  if (!user) {
    return {
      success: false,
      discount: 0,
      newBalance: 0,
      error: 'User not found',
    };
  }

  if (user.pointsBalance < pointsToRedeem) {
    return {
      success: false,
      discount: 0,
      newBalance: user.pointsBalance,
      error: 'Insufficient points balance',
    };
  }

  const discount = calculateDiscountFromPoints(pointsToRedeem, settings.pointValueInRupees);

  // Deduct points and create transaction
  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        pointsBalance: { decrement: pointsToRedeem },
      },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        userId,
        orderId,
        type: LoyaltyTransactionType.REDEEM,
        points: pointsToRedeem,
        description: `Redeemed ${pointsToRedeem} points for ₹${discount} discount`,
      },
    }),
  ]);

  return {
    success: true,
    discount,
    newBalance: updatedUser.pointsBalance,
  };
}

/**
 * Gets user's loyalty information including balance and transaction history
 */
export async function getUserLoyaltyInfo(userId: string, limit = 10) {
  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true, loyaltyTier: true },
    }),
    prisma.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        order: {
          select: { orderNumber: true },
        },
      },
    }),
  ]);

  return {
    pointsBalance: user?.pointsBalance || 0,
    loyaltyTier: user?.loyaltyTier || LoyaltyTier.BASIC,
    transactions,
  };
}
