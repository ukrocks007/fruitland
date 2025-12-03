import { getTenantBySlug } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PageProps {
  params: { tenantSlug: string };
  searchParams: { category?: string; search?: string };
}

export default async function ProductsPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = params;
  const { category, search } = searchParams;

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link key={product.id} href={`/${tenantSlug}/products/${product.id}`}>
                <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group h-full flex flex-col cursor-pointer">
                  <div className="h-48 bg-white flex items-center justify-center relative overflow-hidden">
                    <Badge className="absolute top-4 left-4 bg-white/90 text-gray-900 hover:bg-white shadow-sm backdrop-blur-sm z-10 capitalize">
                      {product.category}
                    </Badge>
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <span className="text-8xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                        🍎
                      </span>
                    )}
                  </div>
                  <CardContent className="p-5 flex-grow">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-green-700 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-700">
                        ₹{product.price}
                      </span>
                      {product.stock > 0 ? (
                        <Badge variant="outline" className="text-green-700 border-green-700">
                          In Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-700 border-red-700">
                          Out of Stock
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
