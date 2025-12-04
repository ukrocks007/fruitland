'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, Eye, Check, X, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Role, RefundStatus, RefundMethod } from '@/types';

interface RefundOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  razorpayPaymentId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Refund {
  id: string;
  orderId: string;
  refundAmount: number;
  refundReason: string;
  status: string;
  refundMethod: string;
  razorpayRefundId: string | null;
  createdAt: string;
  updatedAt: string;
  order: RefundOrder;
  processedByUser: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  razorpayPaymentId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function AdminRefundsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Request refund form state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [requestForm, setRequestForm] = useState({
    orderId: '',
    amount: '',
    reason: '',
    refundMethod: 'ONLINE' as string,
  });

  // Rejection reason
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.role !== Role.ADMIN) {
      router.push('/');
      return;
    }

    fetchRefunds();
  }, [status, session, router]);

  useEffect(() => {
    filterRefunds();
  }, [searchTerm, statusFilter, refunds]);

  const fetchRefunds = async () => {
    try {
      const res = await fetch('/api/admin/refunds');
      if (res.ok) {
        const data = await res.json();
        setRefunds(data);
      }
    } catch (error) {
      console.error('Error fetching refunds:', error);
      toast.error('Failed to load refunds');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        // Filter to only show PAID orders that can be refunded
        const refundableOrders = data.filter(
          (order: Order) => order.paymentStatus === 'PAID'
        );
        setOrders(refundableOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  const filterRefunds = () => {
    let filtered = refunds;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (refund) =>
          refund.order.orderNumber.toLowerCase().includes(term) ||
          refund.order.user.email.toLowerCase().includes(term) ||
          refund.order.user.name?.toLowerCase().includes(term) ||
          refund.id.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((refund) => refund.status === statusFilter);
    }

    setFilteredRefunds(filtered);
  };

  const openRequestDialog = () => {
    setRequestForm({
      orderId: '',
      amount: '',
      reason: '',
      refundMethod: 'ONLINE',
    });
    setIsRequestDialogOpen(true);
    fetchOrders();
  };

  const handleRequestRefund = async () => {
    if (!requestForm.orderId || !requestForm.amount || !requestForm.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(requestForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/refunds/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: requestForm.orderId,
          amount,
          reason: requestForm.reason,
          refundMethod: requestForm.refundMethod,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Refund request created successfully');
        setIsRequestDialogOpen(false);
        fetchRefunds();
      } else {
        toast.error(data.error || 'Failed to create refund request');
      }
    } catch (error) {
      console.error('Error creating refund request:', error);
      toast.error('Failed to create refund request');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveRefund = async () => {
    if (!selectedRefund) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/refunds/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refundId: selectedRefund.id,
          action: 'approve',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Refund approved and processed successfully');
        setIsApproveDialogOpen(false);
        setSelectedRefund(null);
        fetchRefunds();
      } else {
        toast.error(data.error || 'Failed to approve refund');
      }
    } catch (error) {
      console.error('Error approving refund:', error);
      toast.error('Failed to approve refund');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectRefund = async () => {
    if (!selectedRefund) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/refunds/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refundId: selectedRefund.id,
          action: 'reject',
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Refund request rejected');
        setIsRejectDialogOpen(false);
        setSelectedRefund(null);
        setRejectionReason('');
        fetchRefunds();
      } else {
        toast.error(data.error || 'Failed to reject refund');
      }
    } catch (error) {
      console.error('Error rejecting refund:', error);
      toast.error('Failed to reject refund');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (refundStatus: string) => {
    switch (refundStatus) {
      case RefundStatus.REQUESTED:
        return 'bg-yellow-100 text-yellow-800';
      case RefundStatus.APPROVED:
        return 'bg-blue-100 text-blue-800';
      case RefundStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case RefundStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case RefundStatus.FAILED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodBadge = (method: string) => {
    return method === RefundMethod.ONLINE ? (
      <Badge variant="outline" className="bg-blue-50">
        Online
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-orange-50">
        COD
      </Badge>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <AdminNavigation />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Refund Management</CardTitle>
            <Button onClick={openRequestDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Refund Request
            </Button>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by order number, email, or refund ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={RefundStatus.REQUESTED}>Requested</SelectItem>
                  <SelectItem value={RefundStatus.APPROVED}>Approved</SelectItem>
                  <SelectItem value={RefundStatus.COMPLETED}>Completed</SelectItem>
                  <SelectItem value={RefundStatus.REJECTED}>Rejected</SelectItem>
                  <SelectItem value={RefundStatus.FAILED}>Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchRefunds}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRefunds.length > 0 ? (
                    filteredRefunds.map((refund) => (
                      <TableRow
                        key={refund.id}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          setSelectedRefund(refund);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">
                          {refund.order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{refund.order.user.name || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{refund.order.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>₹{refund.refundAmount.toFixed(2)}</TableCell>
                        <TableCell>{getMethodBadge(refund.refundMethod)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(refund.status)}>
                            {refund.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(refund.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedRefund(refund);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {refund.status === RefundStatus.REQUESTED && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => {
                                    setSelectedRefund(refund);
                                    setIsApproveDialogOpen(true);
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    setSelectedRefund(refund);
                                    setRejectionReason('');
                                    setIsRejectDialogOpen(true);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No refunds found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refund Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Refund Details</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Refund ID</p>
                  <p className="font-medium text-sm">{selectedRefund.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={getStatusColor(selectedRefund.status)}>
                    {selectedRefund.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-medium">{selectedRefund.order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Total</p>
                  <p className="font-medium">₹{selectedRefund.order.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Refund Amount</p>
                  <p className="font-medium text-red-600">₹{selectedRefund.refundAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Refund Method</p>
                  {getMethodBadge(selectedRefund.refundMethod)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Requested At</p>
                  <p className="font-medium">
                    {new Date(selectedRefund.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="font-medium">
                    {new Date(selectedRefund.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Reason</p>
                <p className="bg-gray-50 p-3 rounded text-sm">{selectedRefund.refundReason}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-medium">{selectedRefund.order.user.name || 'N/A'}</p>
                  <p className="text-sm text-gray-600">{selectedRefund.order.user.email}</p>
                </div>
              </div>

              {selectedRefund.razorpayRefundId && (
                <div>
                  <p className="text-sm text-gray-500">Razorpay Refund ID</p>
                  <p className="font-mono text-sm bg-gray-50 p-2 rounded">
                    {selectedRefund.razorpayRefundId}
                  </p>
                </div>
              )}

              {selectedRefund.processedByUser && (
                <div>
                  <p className="text-sm text-gray-500">Processed By</p>
                  <p className="font-medium">
                    {selectedRefund.processedByUser.name || selectedRefund.processedByUser.email}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Refund Request Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Refund Request</DialogTitle>
            <DialogDescription>
              Create a refund request for a paid order
            </DialogDescription>
          </DialogHeader>

          {loadingOrders ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Order</Label>
                <Select
                  value={requestForm.orderId}
                  onValueChange={(value) =>
                    setRequestForm({ ...requestForm, orderId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an order" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNumber} - ₹{order.totalAmount.toFixed(2)} ({order.user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Refund Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter refund amount"
                  value={requestForm.amount}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, amount: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Refund Method</Label>
                <Select
                  value={requestForm.refundMethod}
                  onValueChange={(value) =>
                    setRequestForm({ ...requestForm, refundMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select refund method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RefundMethod.ONLINE}>Online (Razorpay)</SelectItem>
                    <SelectItem value={RefundMethod.COD}>COD (Manual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reason for Refund</Label>
                <Textarea
                  placeholder="Enter reason for refund"
                  value={requestForm.reason}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, reason: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsRequestDialogOpen(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button onClick={handleRequestRefund} disabled={processing}>
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Refund</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this refund request?
            </DialogDescription>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-500">Order</p>
                <p className="font-medium">{selectedRefund.order.orderNumber}</p>
                <p className="text-sm text-gray-500 mt-2">Refund Amount</p>
                <p className="font-medium text-red-600">
                  ₹{selectedRefund.refundAmount.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-2">Method</p>
                <p className="font-medium">
                  {selectedRefund.refundMethod === RefundMethod.ONLINE
                    ? 'Online (Razorpay)'
                    : 'COD (Manual)'}
                </p>
              </div>

              {selectedRefund.refundMethod === RefundMethod.ONLINE && (
                <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded">
                  This will initiate a refund through Razorpay. The amount will be credited to the
                  original payment method.
                </p>
              )}

              {selectedRefund.refundMethod === RefundMethod.COD && (
                <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
                  This is a COD refund. Please ensure the refund is processed manually to the
                  customer.
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsApproveDialogOpen(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApproveRefund}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Approve & Process
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Refund</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this refund request.
            </DialogDescription>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-500">Order</p>
                <p className="font-medium">{selectedRefund.order.orderNumber}</p>
                <p className="text-sm text-gray-500 mt-2">Refund Amount</p>
                <p className="font-medium">₹{selectedRefund.refundAmount.toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea
                  placeholder="Enter reason for rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsRejectDialogOpen(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRejectRefund}
                  disabled={processing}
                  variant="destructive"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <X className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
