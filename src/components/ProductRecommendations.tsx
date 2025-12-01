'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, TrendingUp, ShoppingBag, History } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface RecommendedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  isAvailable: boolean;
  isSeasonal: boolean;
  reasonTag: string;
}

interface ProductRecommendationsProps {
  productId: string;
  title?: string;
  limit?: number;
}

const reasonTagLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  frequently_bought_together: {
    label: 'Bought Together',
    icon: <ShoppingBag className="w-3 h-3" />
  },
  trending: {
    label: 'Trending',
    icon: <TrendingUp className="w-3 h-3" />
  },
  based_on_history: {
    label: 'For You',
    icon: <History className="w-3 h-3" />
  },
  frequently_reordered: {
    label: 'Buy Again',
    icon: <History className="w-3 h-3" />
  },
  same_category: {
    label: 'Similar',
    icon: <ShoppingBag className="w-3 h-3" />
  },
};

export function ProductRecommendations({
  productId,
  title = 'You may also like',
  limit = 4,
}: ProductRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/products/${productId}/recommendations?limit=${limit}`
        );
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations || []);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchRecommendations();
    }
  }, [productId, limit]);

  const addToCart = async (product: RecommendedProduct) => {
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

      window.dispatchEvent(new Event('cartUpdated'));
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  if (loading) {
    return (
      <section className="py-8">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {recommendations.map((product) => {
          const reasonInfo = reasonTagLabels[product.reasonTag] || {
            label: 'Recommended',
            icon: <ShoppingBag className="w-3 h-3" />,
          };

          return (
            <Card
              key={product.id}
              className="overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              <div className="relative h-40 w-full bg-gray-100">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                <Badge
                  className="absolute top-2 left-2 bg-green-600 text-white text-xs flex items-center gap-1"
                >
                  {reasonInfo.icon}
                  {reasonInfo.label}
                </Badge>
                {product.isSeasonal && (
                  <Badge className="absolute top-2 right-2 bg-yellow-500 text-xs">
                    Seasonal
                  </Badge>
                )}
              </div>
              <CardContent className="p-4 flex-grow">
                <h3 className="font-semibold text-base mb-1 line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                  {product.description}
                </p>
                <p className="text-lg font-bold text-green-600">
                  ₹{product.price}
                </p>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0 || addingToCart[product.id]}
                >
                  {addingToCart[product.id] ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1" />
                  )}
                  {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
