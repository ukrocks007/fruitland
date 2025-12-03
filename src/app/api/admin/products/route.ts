import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import { getActiveTenantIdFromRequest } from '@/lib/tenant';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active tenant ID from query params
    const { searchParams } = new URL(request.url);
    const tenantId = await getActiveTenantIdFromRequest({ 
      tenantId: searchParams.get('tenantId') || undefined 
    });
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required. Please select a tenant.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, price, category, stock, image, isAvailable } = body;

    if (!name || !price || !category || stock === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        tenantId,
        name,
        description: description || '',
        price: parseFloat(price),
        category,
        stock: parseInt(stock),
        image: image || '',
        isAvailable: isAvailable !== undefined ? isAvailable : true,
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
