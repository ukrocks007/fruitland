import { getTenantBySlug } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ProductsGridClient from '@/components/ProductsGridClient';

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ category?: string; search?: string }>;
}

export default async function ProductsPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const { category, search } = await searchParams;

  // Get tenant
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant || !tenant.isActive) {
    notFound();
  }

  // Build query filters
  const where: any = {
    tenantId: tenant.id,
    isAvailable: true,
  };

  if (category) {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Get products
  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  // Get unique categories for filter
  const categories = await prisma.product.findMany({
    where: { tenantId: tenant.id, isAvailable: true },
    select: { category: true },
    distinct: ['category'],
  });

  const uniqueCategories = categories.map(c => c.category);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar tenantSlug={tenantSlug} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Products</h1>
          <p className="text-gray-600">
            Browse our selection of fresh, organic fruits from {tenant.name}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Filter by Category</h2>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${tenantSlug}/products`}>
              <Button
                variant={!category ? 'default' : 'outline'}
                size="sm"
              >
                All
              </Button>
            </Link>
            {uniqueCategories.map((cat) => (
              <Link key={cat} href={`/${tenantSlug}/products?category=${cat}`}>
                <Button
                  variant={category === cat ? 'default' : 'outline'}
                  size="sm"
                  className="capitalize"
                >
                  {cat}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg">
              No products found. {category && 'Try a different category.'}
            </p>
          </div>
        ) : (
          <ProductsGridClient products={products} tenantSlug={tenantSlug} />
        )}
      </div>
    </div>
  );
}
