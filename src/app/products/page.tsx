'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/navbar';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  isAvailable: boolean;
  isSeasonal: boolean;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categories = ['all', 'fresh', 'seasonal', 'organic', 'exotic'];

  useEffect(() => {
    // Get category from URL
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category') || 'all';
    setSelectedCategory(category);
    fetchProducts(category);
  }, []);

  const fetchProducts = async (category?: string) => {
    setLoading(true);
    try {
      const url = category && category !== 'all' 
        ? `/api/products?category=${category}&available=true`
        : '/api/products?available=true';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    router.push(`/products?category=${cat}`);
    fetchProducts(cat);
  };

  const addToCart = async (product: Product) => {
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Failed to add to cart');
        return;
      }

      // Dispatch custom event to update cart count
      window.dispatchEvent(new Event('cartUpdated'));
      toast.success('Added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Please sign in to add items to cart');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Our Products</h1>
        
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className="cursor-pointer capitalize px-4 py-2 hover:bg-green-600 hover:text-white"
              onClick={() => handleCategoryClick(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-16">
            <p className="text-gray-600">Loading products...</p>
          </div>
        ) : products.length > 0 ? (
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
                  <Button 
                    className="w-full" 
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                  >
                    {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
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
