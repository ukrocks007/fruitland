import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTenantBySlug, ensureCustomerMembership } from '@/lib/tenant';

// GET /api/cart - Get user's cart items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Resolve tenant from query/header
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantSlug') || request.headers.get('x-tenant-slug');
    if (!tenantSlug) {
      return NextResponse.json({ error: 'tenantSlug is required' }, { status: 400 });
    }
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 404 });
    }
    // Ensure membership for customer role
    await ensureCustomerMembership(user.id, tenant.id, user.role);

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id, tenantId: tenant.id },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(cartItems);
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Resolve tenant from query/header
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantSlug') || (request as any).headers?.get?.('x-tenant-slug');
    if (!tenantSlug) {
      return NextResponse.json({ error: 'tenantSlug is required' }, { status: 400 });
    }
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 404 });
    }
    await ensureCustomerMembership(user.id, tenant.id, user.role);

    const { productId, quantity } = await request.json();

    if (!productId || quantity < 1) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Check product exists and has stock
    const product = await prisma.product.findFirst({
      where: { 
        id: productId,
        tenantId: tenant.id,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId_tenantId: {
          userId: user.id,
          productId,
          tenantId: tenant.id,
        },
      },
    });

    let cartItem;

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      
      if (newQuantity > product.stock) {
        return NextResponse.json({ error: 'Not enough stock available' }, { status: 400 });
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: { product: true },
      });
    } else {
      // Create new cart item
      if (quantity > product.stock) {
        return NextResponse.json({ error: 'Not enough stock available' }, { status: 400 });
      }

      cartItem = await prisma.cartItem.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          productId,
          quantity,
        },
        include: { product: true },
      });
    }

    return NextResponse.json(cartItem, { status: 201 });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}

// DELETE /api/cart - Clear entire cart
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Resolve tenant from query/header
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantSlug') || request.headers.get('x-tenant-slug');
    if (!tenantSlug) {
      return NextResponse.json({ error: 'tenantSlug is required' }, { status: 400 });
    }
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 404 });
    }
    await ensureCustomerMembership(user.id, tenant.id, user.role);

    await prisma.cartItem.deleteMany({
      where: { userId: user.id, tenantId: tenant.id },
    });

    return NextResponse.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 });
  }
}
