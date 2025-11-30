import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/navbar';
import { prisma } from '@/lib/prisma';
import Image from 'next/image';

async function getProducts(category?: string) {
  const where: any = { isAvailable: true };
  
  if (category && category !== 'all') {
    where.category = category;
  }
  
  return prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const products = await getProducts(params.category);
  const categories = ['all', 'fresh', 'seasonal', 'organic', 'exotic'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Our Products</h1>
        
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <a key={cat} href={`/products?category=${cat}`}>
              <Badge
                variant={params.category === cat || (!params.category && cat === 'all') ? 'default' : 'outline'}
                className="cursor-pointer capitalize px-4 py-2 hover:bg-green-600 hover:text-white"
              >
                {cat}
              </Badge>
            </a>
          ))}
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition">
                <div className="relative h-48 w-full bg-gray-200">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                  {product.isSeasonal && (
                    <Badge className="absolute top-2 right-2 bg-yellow-500">
                      Seasonal
                    </Badge>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-green-600">
                      ₹{product.price}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {product.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Stock: {product.stock} available
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Add to Cart</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-gray-600">No products found in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
