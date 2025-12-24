import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { getTenantBySlug } from '@/lib/tenant';

// GET all products or filter by category
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const available = searchParams.get('available');
    const tenantSlug = searchParams.get('tenantSlug');

    const where: any = {};
    
    // If tenantSlug is provided, filter by tenant
    if (tenantSlug) {
      const tenant = await getTenantBySlug(tenantSlug);
      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      where.tenantId = tenant.id;
    }
    
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

    // Get user's tenantId
    if (!session.user.tenantId) {
      return NextResponse.json(
        { error: 'User is not associated with a tenant' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, price, image, category, stock, isAvailable, isSeasonal } = body;

    if (!name || !description || price === undefined || !image || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        tenantId: session.user.tenantId,
        name,
        description,
        price,
        image,
        category,
        stock: stock || 0,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        isSeasonal: isSeasonal !== undefined ? isSeasonal : false,
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
