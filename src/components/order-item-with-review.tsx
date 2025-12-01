'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReviewForm } from '@/components/review-form';
import { StarRating } from '@/components/ui/star-rating';
import { MessageSquare, Check } from 'lucide-react';

interface Product {
  id: string;
  name: string;
}

interface Review {
  id: string;
  productId: string;
  rating: number;
}

interface OrderItemWithReviewProps {
  item: {
    id: string;
    product: Product;
    quantity: number;
    price: number;
  };
  canReview: boolean;
  existingReview?: Review | null;
}

export function OrderItemWithReview({ item, canReview, existingReview }: OrderItemWithReviewProps) {
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [hasSubmittedReview, setHasSubmittedReview] = useState(!!existingReview);

  const handleReviewSuccess = () => {
    setHasSubmittedReview(true);
    setIsReviewDialogOpen(false);
  };

  return (
    <div className="flex justify-between items-center border-b pb-2">
      <div className="flex-1">
        <p className="font-medium">{item.product.name}</p>
        <p className="text-sm text-gray-600">
          Quantity: {item.quantity} × ₹{item.price}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-semibold">₹{(item.quantity * item.price).toFixed(2)}</p>
        {canReview && (
          <>
            {hasSubmittedReview || existingReview ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                {existingReview ? (
                  <span className="flex items-center gap-1">
                    Reviewed <StarRating rating={existingReview.rating} size="sm" />
                  </span>
                ) : (
                  'Review Submitted'
                )}
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReviewDialogOpen(true)}
                className="flex items-center gap-1"
              >
                <MessageSquare className="w-3 h-3" />
                Review
              </Button>
            )}
          </>
        )}
      </div>

      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Product</DialogTitle>
          </DialogHeader>
          <ReviewForm
            productId={item.product.id}
            productName={item.product.name}
            onSuccess={handleReviewSuccess}
            onCancel={() => setIsReviewDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
