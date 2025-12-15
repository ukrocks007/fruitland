'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/navbar';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2, ThermometerSnowflake, Clock, Droplet } from 'lucide-react';
import { fetchPublicUiConfig } from '@/lib/public-ui-config';

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
  fatPercentage?: number;
  shelfLifeDays?: number;
  isRefrigerated?: boolean;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showStockOnProductPages, setShowStockOnProductPages] = useState(true);
  const categories = ['all', 'MILK', 'CURD', 'PANEER', 'GHEE', 'BUTTER'];

  useEffect(() => {
    // Get category from URL
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category') || 'all';
    setSelectedCategory(category);
    fetchProducts(category);
    fetchPublicUiConfig().then((cfg) => setShowStockOnProductPages(cfg.showStockOnProductPages));
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
    setAddingToCart(prev => ({ ...prev, [product.id]: true }));
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
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-blue-900">Farm Fresh Dairy Products</h1>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className={`cursor-pointer capitalize px-4 py-2 ${selectedCategory === cat ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-100 hover:text-blue-800'}`}
              onClick={() => handleCategoryClick(cat)}
            >
              {cat.toLowerCase()}
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
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition cursor-pointer border-blue-100" onClick={() => router.push(`/products/${product.id}`)}>
                <div className="relative h-48 w-full bg-blue-50">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {product.isRefrigerated && (
                      <Badge className="bg-cyan-500 text-white flex gap-1 items-center shadow-sm">
                        <ThermometerSnowflake className="w-3 h-3" /> Chilled
                      </Badge>
                    )}
                    {product.isSeasonal && (
                      <Badge className="bg-yellow-500 text-white shadow-sm">
                        Seasonal
                      </Badge>
                    )}
                  </div>
                </div>
                <CardHeader
                  className="cursor-pointer pb-2"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  <CardTitle className="text-lg text-blue-900">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-2 text-sm">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {product.fatPercentage !== null && product.fatPercentage !== undefined && (
                      <div className="flex items-center text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-full">
                        <Droplet className="w-3 h-3 mr-1 text-blue-500" />
                        Fat: {product.fatPercentage}%
                      </div>
                    )}
                    {product.shelfLifeDays !== null && product.shelfLifeDays !== undefined && (
                      <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3 mr-1 text-gray-500" />
                        Shelf: {product.shelfLifeDays}d
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <span className="text-2xl font-bold text-blue-700">
                      ₹{product.price}
                    </span>
                    <Badge variant="secondary" className="uppercase text-xs bg-blue-100 text-blue-700 hover:bg-blue-200">
                      {product.category}
                    </Badge>
                  </div>
                  {showStockOnProductPages && (
                    <p className="text-sm text-gray-500 mt-2">
                      Stock: {product.stock} available
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                    disabled={product.stock === 0 || addingToCart[product.id]}
                  >
                    {addingToCart[product.id] ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      product.stock === 0 ? 'Out of Stock' : 'Add to Cart'
                    )}
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
