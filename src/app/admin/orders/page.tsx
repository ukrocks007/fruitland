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
import { Loader2, Search, Eye, Trash2, Package, Truck, UserPlus, FileText } from 'lucide-react';
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

interface DeliveryPartner {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  address: {
    name: string;
    phone: string;
    city: string;
    state: string;
  };
  items: OrderItem[];
  deliveryPartner: DeliveryPartner | null;
}

interface DeliveryAgent {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  activeOrders: number;
}

export default function AdminOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.role !== Role.ADMIN) {
      router.push('/');
      return;
    }

    fetchOrders();
  }, [status, session, router]);

  useEffect(() => {
    filterOrders();
  }, [searchTerm, statusFilter, paymentFilter, orders]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
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

  const fetchDeliveryAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await fetch('/api/admin/delivery-agents');
      if (res.ok) {
        const data = await res.json();
        setDeliveryAgents(data.agents);
      }
    } catch (error) {
      console.error('Error fetching delivery agents:', error);
      toast.error('Failed to load delivery agents');
    } finally {
      setLoadingAgents(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.user.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter((order) => order.paymentStatus === paymentFilter);
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Order status updated');
        fetchOrders();
      } else {
        console.error('Update error:', data);
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update exception:', error);
      toast.error('Failed to update status');
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Payment status updated');
        fetchOrders();
      } else {
        console.error('Update error:', data);
        toast.error(data.error || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Update exception:', error);
      toast.error('Failed to update payment status');
    }
  };

  const assignDeliveryPartner = async (agentId: string) => {
    if (!selectedOrder) return;

    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryPartnerId: agentId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Delivery partner assigned');
        fetchOrders();
        setIsAssignDialogOpen(false);
      } else {
        console.error('Assign error:', data);
        toast.error(data.error || 'Failed to assign delivery partner');
      }
    } catch (error) {
      console.error('Assign exception:', error);
      toast.error('Failed to assign delivery partner');
    } finally {
      setAssigning(false);
    }
  };

  const unassignDeliveryPartner = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryPartnerId: null }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Delivery partner unassigned');
        fetchOrders();
      } else {
        console.error('Unassign error:', data);
        toast.error(data.error || 'Failed to unassign delivery partner');
      }
    } catch (error) {
      console.error('Unassign exception:', error);
      toast.error('Failed to unassign delivery partner');
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Order deleted successfully');
        fetchOrders();
      } else {
        console.error('Delete error:', data);
        toast.error(data.error || 'Failed to delete order');
      }
    } catch (error) {
      console.error('Delete exception:', error);
      toast.error('Failed to delete order');
    }
  };

  const openAssignDialog = (order: Order) => {
    setSelectedOrder(order);
    setIsAssignDialogOpen(true);
    fetchDeliveryAgents();
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

  if (loading || status === 'loading') {
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

        <h2 className="text-2xl font-semibold mb-2">Order Management</h2>
        <p className="text-gray-600 mb-6">Manage all customer orders</p>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by order number, email..."
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
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Delivery Partner</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.user.name}</p>
                            <p className="text-sm text-gray-500">{order.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>₹{order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={order.status}
                            onValueChange={(value) => updateOrderStatus(order.id, value)}
                          >
                            <SelectTrigger className="w-36">
                              <Badge className={getStatusColor(order.status)}>
                                {order.status.replace('_', ' ')}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="PROCESSING">Processing</SelectItem>
                              <SelectItem value="SHIPPED">Shipped</SelectItem>
                              <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                              <SelectItem value="DELIVERED">Delivered</SelectItem>
                              <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={order.paymentStatus}
                            onValueChange={(value) => updatePaymentStatus(order.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <Badge className={getPaymentColor(order.paymentStatus)}>
                                {order.paymentStatus}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="PAID">Paid</SelectItem>
                              <SelectItem value="FAILED">Failed</SelectItem>
                              <SelectItem value="REFUNDED">Refunded</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {order.deliveryPartner ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                {order.deliveryPartner.name || order.deliveryPartner.email}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => unassignDeliveryPartner(order.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAssignDialog(order)}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Assign
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteOrder(order.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No orders found
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-medium">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-medium">₹{selectedOrder.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={getStatusColor(selectedOrder.status)}>
                    {selectedOrder.status.replace('_', ' ')}
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
                  <p className="text-sm text-gray-600">Phone: {selectedOrder.address.phone}</p>
                  <p className="text-sm text-gray-600">
                    {selectedOrder.address.city}, {selectedOrder.address.state}
                  </p>
                </div>
              </div>

              {selectedOrder.deliveryPartner && (
                <div>
                  <h3 className="font-semibold mb-2">Assigned Delivery Partner</h3>
                  <div className="bg-green-50 p-4 rounded flex items-center gap-2">
                    <Truck className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">
                        {selectedOrder.deliveryPartner.name || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedOrder.deliveryPartner.email}
                      </p>
                      {selectedOrder.deliveryPartner.phone && (
                        <p className="text-sm text-gray-600">
                          Phone: {selectedOrder.deliveryPartner.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={() => {
                    window.open(`/api/admin/export/invoice/${selectedOrder.id}`, '_blank');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download Invoice (PDF)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Delivery Partner Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Delivery Partner</DialogTitle>
            <DialogDescription>
              Select a delivery partner for order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {loadingAgents ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : deliveryAgents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No delivery partners available.</p>
              <p className="text-sm mt-2">
                Assign the DELIVERY_PARTNER role to users in User Management.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliveryAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{agent.name || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{agent.email}</p>
                    <Badge variant="secondary" className="mt-1">
                      {agent.activeOrders} active orders
                    </Badge>
                  </div>
                  <Button
                    onClick={() => assignDeliveryPartner(agent.id)}
                    disabled={assigning}
                    size="sm"
                  >
                    {assigning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Assign'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
