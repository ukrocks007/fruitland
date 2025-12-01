import { prisma } from '@/lib/prisma';
import { RecommendationReason, RecommendedProduct } from '@/types';

// Configuration constants for recommendation algorithms
const MAX_CART_ITEMS_FOR_RECOMMENDATIONS = 3; // Limit cart items analyzed for performance
const TOP_CATEGORIES_COUNT = 3; // Number of top categories to consider for history-based recommendations
const MIN_REORDER_COUNT = 2; // Minimum number of orders for frequently reordered products

// Re-export for convenience
export type { RecommendedProduct } from '@/types';

interface RecommendationOptions {
  limit?: number;
  userId?: string | null;
  excludeProductIds?: string[];
}

/**
 * Get products frequently bought together with the specified product.
 * Analyzes orders containing the product and finds other products in those orders.
 */
async function getFrequentlyBoughtTogether(
  productId: string,
  limit: number = 4,
  excludeProductIds: string[] = []
): Promise<RecommendedProduct[]> {
  // Find all orders containing this product
  const ordersWithProduct = await prisma.orderItem.findMany({
    where: { productId },
    select: { orderId: true },
  });

  if (ordersWithProduct.length === 0) {
    return [];
  }

  const orderIds = ordersWithProduct.map((o) => o.orderId);

  // Find other products in those orders, excluding the current product and specified exclusions
  const coProducts = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      orderId: { in: orderIds },
      productId: { notIn: [productId, ...excludeProductIds] },
    },
    _count: { productId: true },
    orderBy: { _count: { productId: 'desc' } },
    take: limit,
  });

  if (coProducts.length === 0) {
    return [];
  }

  const productIds = coProducts.map((p) => p.productId);

  // Fetch product details
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isAvailable: true,
      stock: { gt: 0 },
    },
  });

  // Sort by co-occurrence count and add reason tag
  const productMap = new Map(products.map((p) => [p.id, p]));
  const result: RecommendedProduct[] = [];

  for (const cp of coProducts) {
    const product = productMap.get(cp.productId);
    if (product) {
      result.push({
        ...product,
        reasonTag: RecommendationReason.FREQUENTLY_BOUGHT_TOGETHER,
      });
    }
  }

  return result.slice(0, limit);
}

/**
 * Get trending products based on highest sales in the last 30 days.
 */
async function getTrendingProducts(
  limit: number = 4,
  excludeProductIds: string[] = []
): Promise<RecommendedProduct[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get order items from the last 30 days, grouped by product
  const trendingProductIds = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      createdAt: { gte: thirtyDaysAgo },
      productId: { notIn: excludeProductIds },
      order: {
        paymentStatus: 'PAID',
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit * 2, // Fetch extra in case some are unavailable
  });

  if (trendingProductIds.length === 0) {
    return [];
  }

  const productIds = trendingProductIds.map((p) => p.productId);

  // Fetch product details
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isAvailable: true,
      stock: { gt: 0 },
    },
  });

  // Sort by sales and add reason tag
  const productMap = new Map(products.map((p) => [p.id, p]));
  const result: RecommendedProduct[] = [];

  for (const tp of trendingProductIds) {
    const product = productMap.get(tp.productId);
    if (product) {
      result.push({
        ...product,
        reasonTag: RecommendationReason.TRENDING,
      });
    }
  }

  return result.slice(0, limit);
}

/**
 * Get recommendations based on customer's purchase history (category-based).
 */
async function getHistoryBasedRecommendations(
  userId: string,
  limit: number = 4,
  excludeProductIds: string[] = []
): Promise<RecommendedProduct[]> {
  // Get categories from user's past orders
  const userOrders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: { category: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10, // Analyze last 10 orders
  });

  if (userOrders.length === 0) {
    return [];
  }

  // Count category frequencies
  const categoryCount: Record<string, number> = {};
  const purchasedProductIds = new Set<string>();

  for (const order of userOrders) {
    for (const item of order.items) {
      purchasedProductIds.add(item.productId);
      const category = item.product.category;
      categoryCount[category] = (categoryCount[category] || 0) + item.quantity;
    }
  }

  // Sort categories by frequency
  const sortedCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  if (sortedCategories.length === 0) {
    return [];
  }

  // Get products from favorite categories that user hasn't bought
  const excludeIds = [...excludeProductIds, ...Array.from(purchasedProductIds)];

  const products = await prisma.product.findMany({
    where: {
      category: { in: sortedCategories.slice(0, TOP_CATEGORIES_COUNT) },
      id: { notIn: excludeIds },
      isAvailable: true,
      stock: { gt: 0 },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return products.map((product) => ({
    ...product,
    reasonTag: RecommendationReason.BASED_ON_HISTORY,
  }));
}

/**
 * Get frequently reordered items for a customer.
 */
async function getFrequentlyReordered(
  userId: string,
  limit: number = 4,
  excludeProductIds: string[] = []
): Promise<RecommendedProduct[]> {
  // Find products ordered multiple times by this user
  // Note: We first get all items then filter in memory due to Prisma groupBy having limitations
  const reorderedProducts = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: {
        userId,
        paymentStatus: 'PAID',
      },
      productId: { notIn: excludeProductIds },
    },
    _count: { productId: true },
    orderBy: { _count: { productId: 'desc' } },
  });

  // Filter products ordered at least MIN_REORDER_COUNT times
  const frequentlyOrderedProducts = reorderedProducts.filter(
    (p) => p._count.productId >= MIN_REORDER_COUNT
  ).slice(0, limit);

  if (frequentlyOrderedProducts.length === 0) {
    return [];
  }

  const productIds = frequentlyOrderedProducts.map((p) => p.productId);

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isAvailable: true,
      stock: { gt: 0 },
    },
  });

  // Sort by reorder count and add reason tag
  const productMap = new Map(products.map((p) => [p.id, p]));
  const result: RecommendedProduct[] = [];

  for (const rp of frequentlyOrderedProducts) {
    const product = productMap.get(rp.productId);
    if (product) {
      result.push({
        ...product,
        reasonTag: RecommendationReason.FREQUENTLY_REORDERED,
      });
    }
  }

  return result.slice(0, limit);
}

/**
 * Get products from the same category.
 */
async function getSameCategoryProducts(
  productId: string,
  limit: number = 4,
  excludeProductIds: string[] = []
): Promise<RecommendedProduct[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { category: true },
  });

  if (!product) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: {
      category: product.category,
      id: { notIn: [productId, ...excludeProductIds] },
      isAvailable: true,
      stock: { gt: 0 },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return products.map((p) => ({
    ...p,
    reasonTag: RecommendationReason.SAME_CATEGORY,
  }));
}

/**
 * Get product recommendations for a specific product page.
 * Combines multiple recommendation strategies:
 * 1. Frequently bought together
 * 2. Same category products
 * 3. For logged-in users: history-based recommendations
 * 4. Trending products as fallback
 */
export async function getProductRecommendations(
  productId: string,
  options: RecommendationOptions = {}
): Promise<RecommendedProduct[]> {
  const { limit = 8, userId = null, excludeProductIds = [] } = options;
  const excludeIds = [productId, ...excludeProductIds];
  const recommendations: RecommendedProduct[] = [];
  const seenIds = new Set<string>(excludeIds);

  const addUnique = (products: RecommendedProduct[]) => {
    for (const product of products) {
      if (!seenIds.has(product.id)) {
        seenIds.add(product.id);
        recommendations.push(product);
      }
    }
  };

  // 1. Frequently bought together (highest priority)
  const fbt = await getFrequentlyBoughtTogether(productId, Math.ceil(limit / 2), Array.from(seenIds));
  addUnique(fbt);

  // 2. For returning customers, add personalized recommendations
  if (userId && recommendations.length < limit) {
    const historyBased = await getHistoryBasedRecommendations(
      userId,
      Math.ceil(limit / 4),
      Array.from(seenIds)
    );
    addUnique(historyBased);
  }

  // 3. Same category products
  if (recommendations.length < limit) {
    const sameCategory = await getSameCategoryProducts(
      productId,
      Math.ceil(limit / 4),
      Array.from(seenIds)
    );
    addUnique(sameCategory);
  }

  // 4. Trending products as fallback
  if (recommendations.length < limit) {
    const trending = await getTrendingProducts(limit - recommendations.length, Array.from(seenIds));
    addUnique(trending);
  }

  return recommendations.slice(0, limit);
}

/**
 * Get recommendations for the cart/checkout page.
 * Based on items in the cart, suggests add-ons and complementary products.
 */
export async function getCartRecommendations(
  cartProductIds: string[],
  options: RecommendationOptions = {}
): Promise<RecommendedProduct[]> {
  const { limit = 6, userId = null, excludeProductIds = [] } = options;
  const excludeIds = [...cartProductIds, ...excludeProductIds];
  const recommendations: RecommendedProduct[] = [];
  const seenIds = new Set<string>(excludeIds);

  const addUnique = (products: RecommendedProduct[]) => {
    for (const product of products) {
      if (!seenIds.has(product.id)) {
        seenIds.add(product.id);
        recommendations.push(product);
      }
    }
  };

  // 1. Frequently bought together with cart items (limit to first few items for performance)
  for (const productId of cartProductIds.slice(0, MAX_CART_ITEMS_FOR_RECOMMENDATIONS)) {
    if (recommendations.length >= limit) break;
    const fbt = await getFrequentlyBoughtTogether(
      productId,
      Math.ceil(limit / MAX_CART_ITEMS_FOR_RECOMMENDATIONS),
      Array.from(seenIds)
    );
    addUnique(fbt);
  }

  // 2. For returning customers, add frequently reordered items
  if (userId && recommendations.length < limit) {
    const reordered = await getFrequentlyReordered(
      userId,
      Math.ceil(limit / MAX_CART_ITEMS_FOR_RECOMMENDATIONS),
      Array.from(seenIds)
    );
    addUnique(reordered);
  }

  // 3. Trending products as fallback
  if (recommendations.length < limit) {
    const trending = await getTrendingProducts(limit - recommendations.length, Array.from(seenIds));
    addUnique(trending);
  }

  return recommendations.slice(0, limit);
}

/**
 * Get trending products for general display (e.g., homepage).
 */
export async function getTrendingRecommendations(
  limit: number = 8,
  excludeProductIds: string[] = []
): Promise<RecommendedProduct[]> {
  return getTrendingProducts(limit, excludeProductIds);
}
