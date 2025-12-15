import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';

// GET all products or filter by category
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const available = searchParams.get('available');

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (available === 'true') {
      where.isAvailable = true;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST - Create new product (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, price, image, category, stock, isAvailable, isSeasonal, fatPercentage, shelfLifeDays, isRefrigerated } = body;

    if (!name || !description || price === undefined || !image || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        image,
        category,
        stock: stock || 0,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        isSeasonal: isSeasonal !== undefined ? isSeasonal : false,
        fatPercentage: fatPercentage ? parseFloat(fatPercentage) : null,
        shelfLifeDays: shelfLifeDays ? parseInt(shelfLifeDays) : null,
        isRefrigerated: isRefrigerated !== undefined ? isRefrigerated : true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
