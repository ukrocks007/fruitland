'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReviewList } from '@/components/review-list';
import { ReviewForm } from '@/components/review-form';
import { StarRating } from '@/components/ui/star-rating';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ShoppingCart, ArrowLeft, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

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

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const productId = params.id as string;

  const fetchProduct = useCallback(async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      } else {
        toast.error('Product not found');
        router.push('/products');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product');
    }
  }, [productId, router]);

  const fetchReviewStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/products/${productId}/reviews?limit=1`);
      if (response.ok) {
        const data = await response.json();
        setReviewStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching review stats:', error);
    }
  }, [productId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProduct(), fetchReviewStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProduct, fetchReviewStats]);

  const addToCart = async () => {
    if (!product) return;

    setAddingToCart(true);
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
      toast.success('Added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Please sign in to add items to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleReviewSuccess = () => {
    setIsReviewDialogOpen(false);
    setHasReviewed(true);
    fetchReviewStats();
    toast.success('Thank you for your review!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-gray-600">Product not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>

        {/* Product Details */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Product Image */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-200">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
            {product.isSeasonal && (
              <Badge className="absolute top-4 right-4 bg-yellow-500">
                Seasonal
              </Badge>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                <Badge variant="outline" className="capitalize">
                  {product.category}
                </Badge>
              </div>
            </div>

            {/* Rating Summary */}
            {reviewStats && reviewStats.totalReviews > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <StarRating rating={reviewStats.averageRating} size="md" />
                <span className="text-lg font-semibold">
                  {reviewStats.averageRating.toFixed(1)}
                </span>
                <span className="text-gray-500">
                  ({reviewStats.totalReviews} reviews)
                </span>
              </div>
            )}

            <p className="text-gray-600 mb-6">{product.description}</p>

            <div className="mb-6">
              <span className="text-4xl font-bold text-green-600">
                ₹{product.price}
              </span>
              <p className="text-sm text-gray-500 mt-1">
                {product.stock > 0 
                  ? `${product.stock} items in stock` 
                  : 'Out of stock'}
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={addToCart}
                disabled={product.stock === 0 || addingToCart}
                className="flex-1"
              >
                {addingToCart ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="w-4 h-4 mr-2" />
                )}
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              
              {session && !hasReviewed && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setIsReviewDialogOpen(true)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Write Review
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Customer Reviews</h2>
          <ReviewList productId={product.id} />
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          <ReviewForm
            productId={product.id}
            productName={product.name}
            onSuccess={handleReviewSuccess}
            onCancel={() => setIsReviewDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
