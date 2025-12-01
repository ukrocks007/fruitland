import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import { subMonths, startOfMonth, addDays, format } from 'date-fns';

/**
 * GET: Fetch all forecasts with product info
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get latest forecast for each product
    const forecasts = await prisma.inventoryForecast.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            stock: true,
            isAvailable: true,
            isSeasonal: true,
            price: true,
          },
        },
      },
      orderBy: [
        { forecastDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Deduplicate to get only the latest forecast per product
    const latestForecasts = new Map<string, typeof forecasts[0]>();
    for (const forecast of forecasts) {
      if (!latestForecasts.has(forecast.productId)) {
        latestForecasts.set(forecast.productId, forecast);
      }
    }

    return NextResponse.json({ 
      forecasts: Array.from(latestForecasts.values()) 
    });
  } catch (error) {
    console.error('Error fetching forecasts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forecasts' },
      { status: 500 }
    );
  }
}

/**
 * POST: Generate new forecasts for all products
 * Uses moving average over last 6 months of sales data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse optional parameters
    const body = await request.json().catch(() => ({}));
    const lookbackMonths = body.lookbackMonths ?? 6;
    const forecastDays = body.forecastDays ?? 30;

    const now = new Date();
    const lookbackStart = startOfMonth(subMonths(now, lookbackMonths));
    const forecastDate = addDays(now, forecastDays);

    // Get all products
    const products = await prisma.product.findMany({
      where: { isAvailable: true },
      select: {
        id: true,
        name: true,
        stock: true,
        isSeasonal: true,
      },
    });

    // Get all order items in the lookback period, grouped by product
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: lookbackStart, lte: now },
          paymentStatus: 'PAID',
        },
      },
      select: {
        productId: true,
        quantity: true,
        order: {
          select: {
            createdAt: true,
          },
        },
      },
    });

    // Aggregate sales per product per month
    const salesByProductMonth = new Map<string, Map<string, number>>();
    
    for (const item of orderItems) {
      const productId = item.productId;
      const monthKey = format(item.order.createdAt, 'yyyy-MM');
      
      if (!salesByProductMonth.has(productId)) {
        salesByProductMonth.set(productId, new Map());
      }
      
      const productSales = salesByProductMonth.get(productId)!;
      productSales.set(monthKey, (productSales.get(monthKey) ?? 0) + item.quantity);
    }

    // Get subscription items for recurring demand
    const subscriptionItems = await prisma.subscriptionItem.findMany({
      where: {
        subscription: {
          status: 'ACTIVE',
        },
      },
      select: {
        productId: true,
        quantity: true,
        subscription: {
          select: {
            frequency: true,
          },
        },
      },
    });

    // Calculate monthly subscription demand per product
    const subscriptionDemandByProduct = new Map<string, number>();
    
    for (const item of subscriptionItems) {
      const productId = item.productId;
      // Convert frequency to monthly multiplier (using 4.33 weeks per month for accuracy)
      let monthlyMultiplier = 1;
      switch (item.subscription.frequency) {
        case 'WEEKLY':
          monthlyMultiplier = 4.33;
          break;
        case 'BIWEEKLY':
          monthlyMultiplier = 2.17;
          break;
        case 'MONTHLY':
          monthlyMultiplier = 1;
          break;
      }
      
      const monthlyQty = item.quantity * monthlyMultiplier;
      subscriptionDemandByProduct.set(
        productId, 
        (subscriptionDemandByProduct.get(productId) ?? 0) + monthlyQty
      );
    }

    // Generate forecasts
    const forecastsToCreate = [];
    // Safety stock multiplier can be overridden via request body, defaults to 20% buffer
    const safetyStockMultiplier = body.safetyStockMultiplier ?? 1.2;

    for (const product of products) {
      const productSales = salesByProductMonth.get(product.id);
      const subscriptionDemand = subscriptionDemandByProduct.get(product.id) ?? 0;
      
      let avgMonthlySales = 0;
      
      if (productSales && productSales.size > 0) {
        // Calculate simple moving average
        const salesValues = Array.from(productSales.values());
        avgMonthlySales = salesValues.reduce((a, b) => a + b, 0) / salesValues.length;
      }

      // Total expected demand = historical average + subscription recurring demand
      const totalMonthlyDemand = avgMonthlySales + subscriptionDemand;
      
      // For the forecast period (30 days ~ 1 month)
      const expectedQuantity = Math.ceil(totalMonthlyDemand);
      
      // Recommended reorder = expected demand with safety stock buffer
      const recommendedReorderQty = Math.ceil(expectedQuantity * safetyStockMultiplier);
      
      // Adjust for current stock
      const netReorder = Math.max(0, recommendedReorderQty - product.stock);
      
      // For seasonal products, we can optionally reduce forecast during off-season
      // Initial implementation treats them normally, but flags are available for future enhancement
      
      forecastsToCreate.push({
        productId: product.id,
        forecastDate,
        expectedQuantity,
        recommendedReorderQty: netReorder,
      });
    }

    // Delete old forecasts for these products (keep only latest)
    const productIds = products.map(p => p.id);
    
    // Create new forecasts in a transaction
    await prisma.$transaction([
      prisma.inventoryForecast.deleteMany({
        where: {
          productId: { in: productIds },
        },
      }),
      ...forecastsToCreate.map(forecast => 
        prisma.inventoryForecast.create({ data: forecast })
      ),
    ]);

    return NextResponse.json({ 
      success: true,
      message: `Generated forecasts for ${forecastsToCreate.length} products`,
      forecastDate: forecastDate.toISOString(),
      parameters: {
        lookbackMonths,
        forecastDays,
        safetyStockMultiplier,
      },
    });
  } catch (error) {
    console.error('Error generating forecasts:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecasts' },
      { status: 500 }
    );
  }
}
