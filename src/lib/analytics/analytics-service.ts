import { prisma } from '@/lib/prisma';
import {
  CustomerCLV,
  CLVSummary,
  CLVDistributionBucket,
  CohortData,
  CohortAnalysis,
  CohortRetention,
  RFMScore,
  RFMSummary,
  RFMHeatmapCell,
  AdvancedAnalyticsSummary,
} from '@/types/analytics';
import { format, differenceInDays, differenceInMonths, startOfMonth, subMonths } from 'date-fns';

const CACHE_KEY_PREFIX = 'advanced_analytics_';
const CACHE_TTL_MINUTES = 15;

async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await prisma.analyticsCache.findUnique({
      where: { key: `${CACHE_KEY_PREFIX}${key}` },
    });

    if (cached && cached.expiresAt > new Date()) {
      return JSON.parse(cached.data) as T;
    }
    return null;
  } catch {
    return null;
  }
}

async function setCachedData(key: string, data: object): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);
    await prisma.analyticsCache.upsert({
      where: { key: `${CACHE_KEY_PREFIX}${key}` },
      update: {
        data: JSON.stringify(data),
        expiresAt,
      },
      create: {
        key: `${CACHE_KEY_PREFIX}${key}`,
        data: JSON.stringify(data),
        expiresAt,
      },
    });
  } catch {
    // Cache write failures are non-critical
  }
}

/**
 * Calculate Customer Lifetime Value metrics for all customers
 */
export async function calculateCLV(): Promise<CLVSummary> {
  const cached = await getCachedData<CLVSummary>('clv');
  if (cached) return cached;

  const now = new Date();

  // Get all customers with their orders and subscriptions
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    include: {
      orders: {
        where: { paymentStatus: 'PAID' },
        select: {
          id: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      subscriptions: {
        select: {
          id: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  const customerCLVs: CustomerCLV[] = customers.map((customer) => {
    const orderCount = customer.orders.length;
    const subscriptionCount = customer.subscriptions.length;
    const totalRevenue = customer.orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    const lastOrderDate = customer.orders.length > 0 ? customer.orders[0].createdAt : null;
    const firstOrderDate = customer.orders.length > 0 
      ? customer.orders[customer.orders.length - 1].createdAt 
      : null;

    const recency = lastOrderDate ? differenceInDays(now, lastOrderDate) : 999;
    const lifetimeDuration = firstOrderDate ? differenceInDays(now, firstOrderDate) : 0;
    
    // Calculate frequency as orders per month
    const monthsActive = lifetimeDuration > 0 ? Math.max(1, lifetimeDuration / 30) : 1;
    const frequency = orderCount / monthsActive;

    // Simple CLV formula: Average Order Value × Purchase Frequency × Customer Lifespan
    // We estimate lifespan as 24 months for active customers, adjusted by recency
    const recencyFactor = recency < 30 ? 1 : recency < 90 ? 0.8 : recency < 180 ? 0.5 : 0.2;
    const estimatedLifespan = 24 * recencyFactor;
    const clvEstimate = averageOrderValue * frequency * estimatedLifespan;

    return {
      userId: customer.id,
      email: customer.email,
      name: customer.name,
      totalRevenue,
      orderCount,
      subscriptionCount,
      averageOrderValue,
      recency,
      frequency,
      lifetimeDuration,
      clvEstimate,
      lastOrderDate,
      firstOrderDate,
      createdAt: customer.createdAt,
    };
  });

  // Sort by CLV estimate descending
  customerCLVs.sort((a, b) => b.clvEstimate - a.clvEstimate);

  // Calculate CLV distribution buckets
  const clvValues = customerCLVs.map((c) => c.clvEstimate).filter((v) => v > 0);
  const maxCLV = Math.max(...clvValues, 0);
  const bucketSize = maxCLV > 0 ? Math.ceil(maxCLV / 5) : 1000;

  const distribution: CLVDistributionBucket[] = [];
  for (let i = 0; i < 5; i++) {
    const min = i * bucketSize;
    const max = (i + 1) * bucketSize;
    const count = clvValues.filter((v) => v >= min && v < max).length;
    distribution.push({
      range: `₹${min.toFixed(0)}-₹${max.toFixed(0)}`,
      min,
      max,
      count,
    });
  }

  // Handle high-value customers
  const highValueCount = clvValues.filter((v) => v >= 5 * bucketSize).length;
  if (highValueCount > 0) {
    distribution.push({
      range: `₹${(5 * bucketSize).toFixed(0)}+`,
      min: 5 * bucketSize,
      max: Infinity,
      count: highValueCount,
    });
  }

  const totalRevenue = customerCLVs.reduce((sum, c) => sum + c.totalRevenue, 0);
  const averageCLV = customerCLVs.length > 0 
    ? customerCLVs.reduce((sum, c) => sum + c.clvEstimate, 0) / customerCLVs.length 
    : 0;

  // Calculate median CLV
  const sortedCLVs = [...clvValues].sort((a, b) => a - b);
  const medianCLV = sortedCLVs.length > 0
    ? sortedCLVs.length % 2 === 0
      ? (sortedCLVs[sortedCLVs.length / 2 - 1] + sortedCLVs[sortedCLVs.length / 2]) / 2
      : sortedCLVs[Math.floor(sortedCLVs.length / 2)]
    : 0;

  const result: CLVSummary = {
    topCustomers: customerCLVs.slice(0, 10),
    averageCLV,
    totalCustomers: customerCLVs.length,
    totalRevenue,
    medianCLV,
    clvDistribution: distribution,
  };

  await setCachedData('clv', result);
  return result;
}

/**
 * Perform cohort analysis based on customer signup/first order month
 */
export async function analyzeCohorts(): Promise<CohortAnalysis> {
  const cached = await getCachedData<CohortAnalysis>('cohorts');
  if (cached) return cached;

  const now = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(now, 5));

  // Get customers with their first order date
  const customers = await prisma.user.findMany({
    where: { 
      role: 'CUSTOMER',
      createdAt: { gte: sixMonthsAgo },
    },
    include: {
      orders: {
        where: { paymentStatus: 'PAID' },
        select: {
          id: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  // Group customers by cohort month (signup month)
  const cohortMap = new Map<string, {
    customers: typeof customers;
    month: Date;
  }>();

  customers.forEach((customer) => {
    const cohortMonth = format(startOfMonth(customer.createdAt), 'yyyy-MM');
    if (!cohortMap.has(cohortMonth)) {
      cohortMap.set(cohortMonth, {
        customers: [],
        month: startOfMonth(customer.createdAt),
      });
    }
    cohortMap.get(cohortMonth)!.customers.push(customer);
  });

  const cohorts: CohortData[] = [];
  const revenuePerCohort: CohortAnalysis['revenuePerCohort'] = [];

  for (const [cohortMonth, { customers: cohortCustomers, month: cohortStartMonth }] of cohortMap) {
    const customerCount = cohortCustomers.length;
    const totalRevenue = cohortCustomers.reduce(
      (sum, c) => sum + c.orders.reduce((s, o) => s + o.totalAmount, 0),
      0
    );
    const totalOrders = cohortCustomers.reduce((sum, c) => sum + c.orders.length, 0);
    const averageOrderCount = customerCount > 0 ? totalOrders / customerCount : 0;

    // Calculate retention by month
    const monthsSinceCohort = differenceInMonths(now, cohortStartMonth);
    const retentionByMonth: CohortRetention[] = [];

    for (let monthIndex = 0; monthIndex <= Math.min(monthsSinceCohort, 5); monthIndex++) {
      const periodStart = startOfMonth(subMonths(now, monthsSinceCohort - monthIndex));
      const periodEnd = startOfMonth(subMonths(now, monthsSinceCohort - monthIndex - 1));

      const activeCustomers = cohortCustomers.filter((customer) =>
        customer.orders.some(
          (order) => order.createdAt >= periodStart && order.createdAt < periodEnd
        )
      ).length;

      const retentionRate = customerCount > 0 ? (activeCustomers / customerCount) * 100 : 0;
      
      const revenue = cohortCustomers.reduce((sum, customer) => {
        return sum + customer.orders
          .filter((order) => order.createdAt >= periodStart && order.createdAt < periodEnd)
          .reduce((s, o) => s + o.totalAmount, 0);
      }, 0);

      retentionByMonth.push({
        monthIndex,
        activeCustomers,
        retentionRate,
        revenue,
      });
    }

    cohorts.push({
      cohortMonth,
      customerCount,
      totalRevenue,
      averageOrderCount,
      retentionByMonth,
    });

    // Monthly revenue breakdown for this cohort
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = startOfMonth(subMonths(now, i - 1));
      
      const revenue = cohortCustomers.reduce((sum, customer) => {
        return sum + customer.orders
          .filter((order) => order.createdAt >= monthStart && order.createdAt < monthEnd)
          .reduce((s, o) => s + o.totalAmount, 0);
      }, 0);

      monthlyRevenue.push({
        month: format(monthStart, 'MMM yyyy'),
        revenue,
      });
    }

    revenuePerCohort.push({
      cohortMonth,
      monthlyRevenue,
    });
  }

  // Calculate overall retention curve
  const maxMonths = Math.max(...cohorts.map((c) => c.retentionByMonth.length), 0);
  const overallRetentionCurve: { month: number; averageRetention: number }[] = [];

  for (let month = 0; month < maxMonths; month++) {
    const retentionRates = cohorts
      .filter((c) => c.retentionByMonth[month])
      .map((c) => c.retentionByMonth[month].retentionRate);

    const averageRetention = retentionRates.length > 0
      ? retentionRates.reduce((sum, r) => sum + r, 0) / retentionRates.length
      : 0;

    overallRetentionCurve.push({ month, averageRetention });
  }

  const result: CohortAnalysis = {
    cohorts: cohorts.sort((a, b) => a.cohortMonth.localeCompare(b.cohortMonth)),
    overallRetentionCurve,
    revenuePerCohort,
  };

  await setCachedData('cohorts', result);
  return result;
}

/**
 * Calculate RFM scores and segments for customers
 */
export async function calculateRFM(): Promise<RFMSummary> {
  const cached = await getCachedData<RFMSummary>('rfm');
  if (cached) return cached;

  const now = new Date();

  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    include: {
      orders: {
        where: { paymentStatus: 'PAID' },
        select: {
          totalAmount: true,
          createdAt: true,
        },
      },
    },
  });

  // Calculate R, F, M values for each customer
  const rfmData = customers.map((customer) => {
    const lastOrder = customer.orders.reduce<Date | null>(
      (latest, order) => (!latest || order.createdAt > latest ? order.createdAt : latest),
      null
    );

    const recency = lastOrder ? differenceInDays(now, lastOrder) : 999;
    const frequency = customer.orders.length;
    const monetary = customer.orders.reduce((sum, order) => sum + order.totalAmount, 0);

    return {
      userId: customer.id,
      email: customer.email,
      name: customer.name,
      recency,
      frequency,
      monetary,
    };
  });

  // Calculate quintiles for R, F, M
  const getQuintileScores = (values: number[], reverse: boolean = false): Map<number, number> => {
    const sorted = [...values].sort((a, b) => a - b);
    const quintileSize = Math.ceil(sorted.length / 5);
    const scoreMap = new Map<number, number>();

    sorted.forEach((value, index) => {
      let score = Math.min(5, Math.floor(index / quintileSize) + 1);
      if (reverse) score = 6 - score;
      scoreMap.set(value, score);
    });

    return scoreMap;
  };

  // For recency, lower is better (reverse scoring)
  // For frequency and monetary, higher is better
  const recencyScores = getQuintileScores(rfmData.map((d) => d.recency), true);
  const frequencyScores = getQuintileScores(rfmData.map((d) => d.frequency), false);
  const monetaryScores = getQuintileScores(rfmData.map((d) => d.monetary), false);

  // Assign segments based on RFM scores
  const getSegment = (r: number, f: number, m: number): string => {
    const avgScore = (r + f + m) / 3;
    
    if (r >= 4 && f >= 4 && m >= 4) return 'Champions';
    if (r >= 4 && f >= 3) return 'Loyal Customers';
    if (r >= 4 && f <= 2) return 'New Customers';
    if (r >= 3 && f >= 3) return 'Potential Loyalists';
    if (r >= 3 && f <= 2) return 'Promising';
    if (r <= 2 && f >= 4) return 'At Risk';
    if (r <= 2 && f >= 2) return 'Need Attention';
    if (r <= 2 && f <= 2 && m >= 3) return 'Hibernating';
    if (avgScore <= 2) return 'Lost';
    return 'Other';
  };

  const rfmScores: RFMScore[] = rfmData.map((data) => {
    const recencyScore = recencyScores.get(data.recency) || 3;
    const frequencyScore = frequencyScores.get(data.frequency) || 3;
    const monetaryScore = monetaryScores.get(data.monetary) || 3;

    return {
      ...data,
      recencyScore,
      frequencyScore,
      monetaryScore,
      rfmScore: `${recencyScore}${frequencyScore}${monetaryScore}`,
      segment: getSegment(recencyScore, frequencyScore, monetaryScore),
    };
  });

  // Calculate segment distribution
  const segmentCounts = new Map<string, number>();
  rfmScores.forEach((score) => {
    segmentCounts.set(score.segment, (segmentCounts.get(score.segment) || 0) + 1);
  });

  const segmentDistribution = Array.from(segmentCounts.entries()).map(([segment, count]) => ({
    segment,
    count,
    percentage: (count / rfmScores.length) * 100,
  })).sort((a, b) => b.count - a.count);

  // Create RFM heatmap data
  const heatmapMap = new Map<string, { totalMonetary: number; count: number }>();
  rfmScores.forEach((score) => {
    const key = `${score.recencyScore}-${score.frequencyScore}`;
    const existing = heatmapMap.get(key) || { totalMonetary: 0, count: 0 };
    heatmapMap.set(key, {
      totalMonetary: existing.totalMonetary + score.monetary,
      count: existing.count + 1,
    });
  });

  const rfmHeatmap: RFMHeatmapCell[] = [];
  for (let r = 1; r <= 5; r++) {
    for (let f = 1; f <= 5; f++) {
      const data = heatmapMap.get(`${r}-${f}`);
      rfmHeatmap.push({
        recencyScore: r,
        frequencyScore: f,
        averageMonetary: data ? data.totalMonetary / data.count : 0,
        customerCount: data?.count || 0,
      });
    }
  }

  const result: RFMSummary = {
    customers: rfmScores.sort((a, b) => b.monetary - a.monetary),
    segmentDistribution,
    rfmHeatmap,
  };

  await setCachedData('rfm', result);
  return result;
}

/**
 * Calculate summary metrics for advanced analytics dashboard
 */
export async function calculateSummary(): Promise<AdvancedAnalyticsSummary> {
  const cached = await getCachedData<AdvancedAnalyticsSummary>('summary');
  if (cached) return cached;

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    totalCustomers,
    newCustomersThisMonth,
    activeSubscriptions,
    cancelledSubscriptionsLastMonth,
    activeCustomers,
    paidOrders,
  ] = await Promise.all([
    // Total customers
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    // New customers this month
    prisma.user.count({
      where: {
        role: 'CUSTOMER',
        createdAt: { gte: thisMonthStart },
      },
    }),
    // Active subscriptions with their amounts
    prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      select: { totalAmount: true },
    }),
    // Cancelled subscriptions last month (for churn rate)
    prisma.subscription.count({
      where: {
        status: 'CANCELLED',
        cancelledAt: {
          gte: lastMonthStart,
          lt: thisMonthStart,
        },
      },
    }),
    // Active customers (ordered in last 90 days)
    prisma.user.count({
      where: {
        role: 'CUSTOMER',
        orders: {
          some: {
            createdAt: { gte: ninetyDaysAgo },
            paymentStatus: 'PAID',
          },
        },
      },
    }),
    // All paid orders
    prisma.order.findMany({
      where: { paymentStatus: 'PAID' },
      select: { totalAmount: true, userId: true },
    }),
  ]);

  const monthlyRecurringRevenue = activeSubscriptions.reduce(
    (sum, sub) => sum + sub.totalAmount,
    0
  );

  // Calculate churn rate (cancelled / (active + cancelled) * 100)
  const totalSubscriptionsLastMonth = activeSubscriptions.length + cancelledSubscriptionsLastMonth;
  const churnRate = totalSubscriptionsLastMonth > 0
    ? (cancelledSubscriptionsLastMonth / totalSubscriptionsLastMonth) * 100
    : 0;

  const retentionRate = 100 - churnRate;

  // Calculate average order value
  const totalOrderRevenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const averageOrderValue = paidOrders.length > 0 ? totalOrderRevenue / paidOrders.length : 0;

  // Calculate average orders per customer
  const customersWithOrders = new Set(paidOrders.map((o) => o.userId)).size;
  const averageOrdersPerCustomer = customersWithOrders > 0
    ? paidOrders.length / customersWithOrders
    : 0;

  // Calculate average CLV using a simplified formula
  // CLV = Average Order Value × Purchase Frequency × Estimated Lifespan
  const purchaseFrequency = averageOrdersPerCustomer / 12; // monthly frequency
  const estimatedLifespanMonths = 24; // 2-year estimated lifespan
  const averageCLV = averageOrderValue * purchaseFrequency * estimatedLifespanMonths;

  // Lifetime revenue projection (average CLV × total customers)
  const lifetimeRevenueProjection = averageCLV * totalCustomers;

  const result: AdvancedAnalyticsSummary = {
    totalCustomers,
    averageCLV,
    monthlyRecurringRevenue,
    churnRate,
    activeCustomers,
    newCustomersThisMonth,
    retentionRate,
    averageOrderValue,
    averageOrdersPerCustomer,
    lifetimeRevenueProjection,
  };

  await setCachedData('summary', result);
  return result;
}
