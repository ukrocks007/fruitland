import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { getTenantBySlug, validateTenantAccess } from '@/lib/tenant';

// GET single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantSlug = request.nextUrl.searchParams.get('tenantSlug');

    if (!tenantSlug) {
      // Fallback for non-tenant-aware requests (backwards compatibility)
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(product);
    }

    // Tenant-aware request
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant || !tenant.isActive) {
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 404 }
      );
    }

    const product = await prisma.product.findFirst({
      where: {
        id,
        tenantId: tenant.id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT - Update product (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, price, image, category, stock, isAvailable, isSeasonal } = body;

    // Get product to check tenant
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { tenantId: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate tenant access
    if (session.user.role !== Role.SUPERADMIN) {
      if (!validateTenantAccess(session.user.role, session.user.tenantId, existingProduct.tenantId)) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(price !== undefined && { price }),
        ...(image && { image }),
        ...(category && { category }),
        ...(stock !== undefined && { stock }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(isSeasonal !== undefined && { isSeasonal }),
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE product (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get product to check tenant
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { tenantId: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate tenant access
    if (session.user.role !== Role.SUPERADMIN) {
      if (!validateTenantAccess(session.user.role, session.user.tenantId, existingProduct.tenantId)) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
