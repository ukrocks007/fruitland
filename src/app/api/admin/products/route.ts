import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenantId
    if (!session.user.tenantId) {
      return NextResponse.json(
        { error: 'User is not associated with a tenant' },
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
        tenantId: session.user.tenantId,
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
