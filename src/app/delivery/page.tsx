'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Search, Eye, Package, MapPin, Phone, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Role } from '@/types';

interface OrderItem {
  id: string;
  product: {
    name: string;
    image: string;
  };
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  deliveryNotes: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  address: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  items: OrderItem[];
}

export default function DeliveryDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.role !== Role.DELIVERY_PARTNER) {
      router.push('/');
      return;
    }

    fetchOrders();
  }, [status, session, router]);

  const filterOrders = useCallback(() => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.address.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter]);

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/delivery/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/delivery/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          deliveryNotes: deliveryNotes || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Order status updated');
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(data);
        }
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update exception:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updatePaymentStatus = async (orderId: string) => {
    setUpdatingPayment(true);
    try {
      const res = await fetch(`/api/delivery/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'PAID' }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Payment marked as received');
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(data);
        }
      } else {
        toast.error(data.error || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Update exception:', error);
      toast.error('Failed to update payment status');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const getStatusColor = (orderStatus: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[orderStatus] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentColor = (paymentStat: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800',
    };
    return colors[paymentStat] || 'bg-gray-100 text-gray-800';
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setDeliveryNotes(order.deliveryNotes || '');
    setIsDetailsOpen(true);
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  const pendingCount = orders.filter(
    (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
  ).length;
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;
  const codPendingCount = orders.filter(
    (o) => o.paymentStatus === 'PENDING' && o.status !== 'CANCELLED'
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Delivery Dashboard</h1>
            <p className="text-gray-600">Manage your assigned deliveries</p>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-green-600" />
            <span className="text-sm text-gray-600">
              Welcome, {session?.user?.name || 'Delivery Partner'}
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Deliveries</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {pendingCount}
                  </p>
                </div>
                <Package className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Delivered Today</p>
                  <p className="text-2xl font-bold text-green-600">
                    {deliveredCount}
                  </p>
                </div>
                <Truck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">COD Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {codPendingCount}
                  </p>
                </div>
                <Package className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by order number, customer, city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Order Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => openOrderDetails(order)}
                      >
                        <TableCell className="font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.user.name}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {order.address.phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">
                              {order.address.city}, {order.address.pincode}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>₹{order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentColor(order.paymentStatus)}>
                            {order.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openOrderDetails(order);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-gray-500"
                      >
                        No orders assigned to you
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-medium text-lg">
                    ₹{selectedOrder.totalAmount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={getStatusColor(selectedOrder.status)}>
                    {selectedOrder.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <Badge className={getPaymentColor(selectedOrder.paymentStatus)}>
                    {selectedOrder.paymentStatus}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-medium">{selectedOrder.user.name}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.user.email}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Delivery Address</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-medium">{selectedOrder.address.name}</p>
                  <p className="text-sm text-gray-600">
                    <Phone className="h-3 w-3 inline mr-1" />
                    {selectedOrder.address.phone}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedOrder.address.addressLine1}
                    {selectedOrder.address.addressLine2 && (
                      <>, {selectedOrder.address.addressLine2}</>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedOrder.address.city}, {selectedOrder.address.state} -{' '}
                    {selectedOrder.address.pincode}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center bg-gray-50 p-3 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-gray-500">
                            Qty: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Delivery Notes</h3>
                <Textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Add notes about the delivery..."
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {selectedOrder.status !== 'DELIVERED' &&
                  selectedOrder.status !== 'CANCELLED' && (
                    <>
                      {selectedOrder.status !== 'OUT_FOR_DELIVERY' && (
                        <Button
                          onClick={() =>
                            updateOrderStatus(selectedOrder.id, 'OUT_FOR_DELIVERY')
                          }
                          disabled={updatingStatus}
                          variant="outline"
                        >
                          {updatingStatus ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Truck className="h-4 w-4 mr-2" />
                          )}
                          Mark Out for Delivery
                        </Button>
                      )}
                      <Button
                        onClick={() =>
                          updateOrderStatus(selectedOrder.id, 'DELIVERED')
                        }
                        disabled={updatingStatus}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {updatingStatus ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Package className="h-4 w-4 mr-2" />
                        )}
                        Mark as Delivered
                      </Button>
                    </>
                  )}
                {selectedOrder.paymentStatus === 'PENDING' &&
                  selectedOrder.status !== 'CANCELLED' && (
                    <Button
                      onClick={() => updatePaymentStatus(selectedOrder.id)}
                      disabled={updatingPayment}
                      variant="outline"
                      className="border-green-600 text-green-600 hover:bg-green-50"
                    >
                      {updatingPayment ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Collect Payment (COD)
                    </Button>
                  )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
