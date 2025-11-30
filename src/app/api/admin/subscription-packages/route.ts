import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const packages = await prisma.subscriptionPackage.findMany({
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, frequency, price, imageUrl, features, isActive } = body;

    if (!name || !frequency || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const subscriptionPackage = await prisma.subscriptionPackage.create({
      data: {
        name,
        description: description || null,
        frequency,
        price: parseFloat(price),
        imageUrl: imageUrl || null,
        features: features || '',
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({ package: subscriptionPackage });
  } catch (error) {
    console.error('Error creating subscription package:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription package' },
      { status: 500 }
    );
  }
}
