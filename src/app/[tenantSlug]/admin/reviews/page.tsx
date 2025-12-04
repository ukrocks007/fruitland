'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StarRating } from '@/components/ui/star-rating';
import { Loader2, Eye, Check, X, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Role, Review, ReviewStatus } from '@/types';
import { format } from 'date-fns';
import Image from 'next/image';

interface ReviewWithDetails extends Review {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  product: {
    id: string;
    name: string;
    image: string;
  };
}

interface StatusCounts {
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
}

export default function AdminReviewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
  const [selectedReview, setSelectedReview] = useState<ReviewWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? `/api/admin/reviews?page=${page}&limit=20`
        : `/api/admin/reviews?status=${statusFilter}&page=${page}&limit=20`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
        setStatusCounts(data.statusCounts);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.role !== Role.ADMIN) {
      router.push('/');
      return;
    }

    fetchReviews();
  }, [status, session, router, fetchReviews]);

  const updateReviewStatus = async (reviewId: string, newStatus: keyof typeof ReviewStatus) => {
    setActionLoading(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Review ${newStatus.toLowerCase()}`);
        fetchReviews();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update review');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error('Failed to update review');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    setActionLoading(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Review deleted successfully');
        fetchReviews();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (reviewStatus: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return colors[reviewStatus] || 'bg-gray-100 text-gray-800';
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <AdminNavigation />

        <h2 className="text-2xl font-semibold mb-2">Review Moderation</h2>
        <p className="text-gray-600 mb-6">Manage and moderate customer reviews</p>

        {/* Status Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
            onClick={() => { setStatusFilter('PENDING'); setPage(1); }}
          >
            Pending ({statusCounts.PENDING})
          </Button>
          <Button
            variant={statusFilter === 'APPROVED' ? 'default' : 'outline'}
            onClick={() => { setStatusFilter('APPROVED'); setPage(1); }}
          >
            Approved ({statusCounts.APPROVED})
          </Button>
          <Button
            variant={statusFilter === 'REJECTED' ? 'default' : 'outline'}
            onClick={() => { setStatusFilter('REJECTED'); setPage(1); }}
          >
            Rejected ({statusCounts.REJECTED})
          </Button>
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => { setStatusFilter('all'); setPage(1); }}
          >
            All ({statusCounts.PENDING + statusCounts.APPROVED + statusCounts.REJECTED})
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reviews</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.length > 0 ? (
                    reviews.map((review) => (
                      <TableRow
                        key={review.id}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          setSelectedReview(review);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100">
                              <Image
                                src={review.product.image}
                                alt={review.product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <span className="font-medium truncate max-w-[150px]">
                              {review.product.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{review.user.name || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{review.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StarRating rating={review.rating} size="sm" />
                            {review.verifiedPurchase && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="truncate max-w-[200px]" title={review.comment}>
                            {review.title && <strong>{review.title}: </strong>}
                            {review.comment}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(review.status)}>
                            {review.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(review.createdAt), 'PP')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedReview(review);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {review.status !== 'APPROVED' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateReviewStatus(review.id, 'APPROVED')}
                                disabled={actionLoading === review.id}
                              >
                                {actionLoading === review.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                            )}
                            {review.status !== 'REJECTED' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateReviewStatus(review.id, 'REJECTED')}
                                disabled={actionLoading === review.id}
                              >
                                {actionLoading === review.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4 text-red-600" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteReview(review.id)}
                              disabled={actionLoading === review.id}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No reviews found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <span className="flex items-center px-3 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Review Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="relative w-16 h-16 rounded overflow-hidden">
                  <Image
                    src={selectedReview.product.image}
                    alt={selectedReview.product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold">{selectedReview.product.name}</p>
                  <Badge className={getStatusColor(selectedReview.status)}>
                    {selectedReview.status}
                  </Badge>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="font-semibold mb-2">Customer</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-medium">{selectedReview.user.name || 'N/A'}</p>
                  <p className="text-sm text-gray-600">{selectedReview.user.email}</p>
                </div>
              </div>

              {/* Rating */}
              <div>
                <h3 className="font-semibold mb-2">Rating</h3>
                <div className="flex items-center gap-3">
                  <StarRating rating={selectedReview.rating} size="lg" />
                  <span className="text-2xl font-bold">{selectedReview.rating}/5</span>
                  {selectedReview.verifiedPurchase && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Verified Purchase
                    </Badge>
                  )}
                </div>
              </div>

              {/* Review Content */}
              <div>
                <h3 className="font-semibold mb-2">Review</h3>
                <div className="bg-gray-50 p-4 rounded">
                  {selectedReview.title && (
                    <h4 className="font-semibold mb-2">{selectedReview.title}</h4>
                  )}
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedReview.comment}</p>
                </div>
              </div>

              {/* Date */}
              <div>
                <p className="text-sm text-gray-500">
                  Submitted on {format(new Date(selectedReview.createdAt), 'PPP')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedReview.status !== 'APPROVED' && (
                  <Button
                    onClick={() => {
                      updateReviewStatus(selectedReview.id, 'APPROVED');
                      setIsDetailsOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </Button>
                )}
                {selectedReview.status !== 'REJECTED' && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      updateReviewStatus(selectedReview.id, 'REJECTED');
                      setIsDetailsOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
