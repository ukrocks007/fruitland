import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CONFIG_KEY_SHOW_STOCK_ON_PRODUCT_PAGES = 'SHOW_STOCK_ON_PRODUCT_PAGES';

export async function GET() {
  try {
    const config = await prisma.config.findUnique({
      where: { key: CONFIG_KEY_SHOW_STOCK_ON_PRODUCT_PAGES },
      select: { value: true },
    });

    const showStockOnProductPages = config?.value !== 'false';

    return NextResponse.json({ showStockOnProductPages });
  } catch (error) {
    console.error('Error fetching public config:', error);
    return NextResponse.json(
      { showStockOnProductPages: true },
      { status: 200 }
    );
  }
}
