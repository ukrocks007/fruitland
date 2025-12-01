'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

interface CartRecommendationsProps {
  cartProductIds: string[];
  title?: string;
  limit?: number;
  onAddToCart?: () => void;
}

const reasonTagLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  frequently_bought_together: {
    label: 'Bought Together',
    icon: <ShoppingBag className="w-3 h-3" />
  },
  trending: {
    label: 'Popular',
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

export function CartRecommendations({
  cartProductIds,
  title = 'Customers also bought',
  limit = 4,
  onAddToCart,
}: CartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (cartProductIds.length === 0) {
        setRecommendations([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/cart/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: cartProductIds, limit }),
        });

        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations || []);
        }
      } catch (error) {
        console.error('Error fetching cart recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [cartProductIds, limit]);

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

      // Remove from recommendations after adding
      setRecommendations((prev) => prev.filter((p) => p.id !== product.id));

      // Notify parent component
      onAddToCart?.();
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recommendations.map((product) => {
          const reasonInfo = reasonTagLabels[product.reasonTag] || {
            label: 'Add-on',
            icon: <Plus className="w-3 h-3" />,
          };

          return (
            <Card key={product.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 rounded overflow-hidden bg-gray-100">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Badge
                          variant="secondary"
                          className="text-xs mb-1 flex items-center gap-1 w-fit"
                        >
                          {reasonInfo.icon}
                          {reasonInfo.label}
                        </Badge>
                        <h4 className="font-medium text-sm line-clamp-1">
                          {product.name}
                        </h4>
                        <p className="text-sm text-green-600 font-semibold">
                          ₹{product.price}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0 || addingToCart[product.id]}
                      >
                        {addingToCart[product.id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
