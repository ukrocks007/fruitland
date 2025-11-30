import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const packages = await prisma.subscriptionPackage.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Error fetching subscription packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription packages' },
      { status: 500 }
    );
  }
}
