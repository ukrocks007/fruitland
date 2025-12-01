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
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, Eye, Trash2, CheckCircle, XCircle, FileText, Download, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Role, BulkOrderStatus } from '@/types';

interface OrderItem {
  id: string;
  product: {
    id: string;
    name: string;
    image: string;
    price: number;
  };
  quantity: number;
  price: number;
}

interface BulkOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  bulkOrderStatus: string | null;
  bulkCustomerName: string | null;
  bulkCustomerContact: string | null;
  bulkCustomerGST: string | null;
  bulkDiscountPercent: number | null;
  bulkOrderNote: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  address: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  items: OrderItem[];
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  order: BulkOrder;
  customer: {
    name: string | null;
    contact: string | null;
    gstNumber: string | null;
    address: BulkOrder['address'];
  };
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  summary: {
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    taxableAmount: number;
    gstRate: number;
    gstAmount: number;
    grandTotal: number;
  };
}

export default function AdminBulkOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<BulkOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<BulkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkStatusFilter, setBulkStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<BulkOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

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
  }, [searchTerm, bulkStatusFilter, paymentFilter, orders]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/bulk-orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching bulk orders:', error);
      toast.error('Failed to load bulk orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.bulkCustomerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (bulkStatusFilter !== 'all') {
      filtered = filtered.filter((order) => order.bulkOrderStatus === bulkStatusFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter((order) => order.paymentStatus === paymentFilter);
    }

    setFilteredOrders(filtered);
  };

  const updateBulkOrderStatus = async (orderId: string, bulkOrderStatus: string) => {
    try {
      const res = await fetch(`/api/admin/bulk-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulkOrderStatus }),
      });

      if (res.ok) {
        toast.success(`Order ${bulkOrderStatus === BulkOrderStatus.APPROVED ? 'approved' : 'rejected'} successfully`);
        fetchOrders();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order status');
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    try {
      const res = await fetch(`/api/admin/bulk-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus }),
      });

      if (res.ok) {
        toast.success('Payment status updated');
        fetchOrders();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment status');
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this bulk order?')) return;

    try {
      const res = await fetch(`/api/admin/bulk-orders/${orderId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Bulk order deleted');
        fetchOrders();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    }
  };

  const fetchInvoiceData = async (orderId: string) => {
    setLoadingInvoice(true);
    try {
      const res = await fetch(`/api/admin/bulk-orders/${orderId}?format=invoice`);
      if (res.ok) {
        const data = await res.json();
        setInvoiceData(data);
        setIsInvoiceOpen(true);
      } else {
        toast.error('Failed to load invoice data');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const downloadInvoiceCSV = () => {
    if (!invoiceData) return;

    const headers = ['Item', 'Quantity', 'Unit Price', 'Total'];
    const rows = invoiceData.items.map(item =>
      [item.name, item.quantity, item.unitPrice, item.total].join(',')
    );

    const summaryRows = [
      '',
      `Subtotal,,, ${invoiceData.summary.subtotal}`,
      `Discount (${invoiceData.summary.discountPercent}%),,, -${invoiceData.summary.discountAmount}`,
      `Taxable Amount,,, ${invoiceData.summary.taxableAmount}`,
      `GST (${invoiceData.summary.gstRate}%),,, ${invoiceData.summary.gstAmount}`,
      `Grand Total,,, ${invoiceData.summary.grandTotal}`,
    ];

    const csv = [
      `Invoice Number: ${invoiceData.invoiceNumber}`,
      `Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString()}`,
      `Customer: ${invoiceData.customer.name}`,
      `Contact: ${invoiceData.customer.contact}`,
      invoiceData.customer.gstNumber ? `GST: ${invoiceData.customer.gstNumber}` : '',
      '',
      headers.join(','),
      ...rows,
      ...summaryRows,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceData.invoiceNumber}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getBulkStatusColor = (bulkStatus: string | null) => {
    const colors: Record<string, string> = {
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      INVOICE_GENERATED: 'bg-blue-100 text-blue-800',
    };
    return colors[bulkStatus || ''] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentColor = (paymentStatus: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800',
    };
    return colors[paymentStatus] || 'bg-gray-100 text-gray-800';
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

        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-6 w-6 text-green-600" />
          <div>
            <h2 className="text-2xl font-semibold">Bulk Order Management</h2>
            <p className="text-gray-600">Manage wholesale and B2B orders</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by order number, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={bulkStatusFilter} onValueChange={setBulkStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Bulk Order Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="INVOICE_GENERATED">Invoice Generated</SelectItem>
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
                    <TableHead>Discount</TableHead>
                    <TableHead>Bulk Status</TableHead>
                    <TableHead>Payment</TableHead>
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
                            <p className="font-medium">{order.bulkCustomerName}</p>
                            <p className="text-sm text-gray-500">{order.bulkCustomerContact}</p>
                            {order.bulkCustomerGST && (
                              <p className="text-xs text-gray-400">GST: {order.bulkCustomerGST}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>₹{order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          {order.bulkDiscountPercent ? (
                            <Badge variant="outline" className="bg-green-50">
                              {order.bulkDiscountPercent}% off
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getBulkStatusColor(order.bulkOrderStatus)}>
                            {order.bulkOrderStatus?.replace('_', ' ') || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={order.paymentStatus}
                            onValueChange={(value) => updatePaymentStatus(order.id, value)}
                          >
                            <SelectTrigger className="w-28">
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
                        <TableCell>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {order.bulkOrderStatus === BulkOrderStatus.PENDING_APPROVAL && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => updateBulkOrderStatus(order.id, BulkOrderStatus.APPROVED)}
                                  title="Approve"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-600"
                                  onClick={() => updateBulkOrderStatus(order.id, BulkOrderStatus.REJECTED)}
                                  title="Reject"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => fetchInvoiceData(order.id)}
                              title="Generate Invoice"
                              disabled={loadingInvoice}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsDetailsOpen(true);
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteOrder(order.id)}
                              title="Delete"
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
                        No bulk orders found
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
            <DialogTitle>Bulk Order Details</DialogTitle>
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
                  <p className="text-sm text-gray-500">Discount Applied</p>
                  <p className="font-medium text-green-600">
                    {selectedOrder.bulkDiscountPercent || 0}%
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Business Information</h3>
                <div className="bg-gray-50 p-4 rounded space-y-1">
                  <p><span className="text-gray-500">Customer:</span> {selectedOrder.bulkCustomerName}</p>
                  <p><span className="text-gray-500">Contact:</span> {selectedOrder.bulkCustomerContact}</p>
                  {selectedOrder.bulkCustomerGST && (
                    <p><span className="text-gray-500">GST:</span> {selectedOrder.bulkCustomerGST}</p>
                  )}
                  {selectedOrder.bulkOrderNote && (
                    <p><span className="text-gray-500">Notes:</span> {selectedOrder.bulkOrderNote}</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Delivery Address</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-medium">{selectedOrder.address.name}</p>
                  <p className="text-sm text-gray-600">
                    {selectedOrder.address.addressLine1}
                    {selectedOrder.address.addressLine2 && `, ${selectedOrder.address.addressLine2}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedOrder.address.city}, {selectedOrder.address.state} - {selectedOrder.address.pincode}
                  </p>
                  <p className="text-sm text-gray-600">Phone: {selectedOrder.address.phone}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Order Items ({selectedOrder.items.length})</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-gray-500">₹{item.price} × {item.quantity}</p>
                      </div>
                      <p className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Preview
            </DialogTitle>
            <DialogDescription>
              Review invoice details before downloading
            </DialogDescription>
          </DialogHeader>
          {invoiceData && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{invoiceData.invoiceNumber}</h3>
                  <p className="text-sm text-gray-500">
                    Date: {new Date(invoiceData.invoiceDate).toLocaleDateString()}
                  </p>
                </div>
                <Button onClick={downloadInvoiceCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Bill To:</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p className="font-medium">{invoiceData.customer.name}</p>
                  <p>{invoiceData.customer.contact}</p>
                  {invoiceData.customer.gstNumber && (
                    <p>GST: {invoiceData.customer.gstNumber}</p>
                  )}
                  <p>
                    {invoiceData.customer.address.addressLine1}, {invoiceData.customer.address.city}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Items:</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceData.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">₹{item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{item.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{invoiceData.summary.subtotal.toFixed(2)}</span>
                </div>
                {invoiceData.summary.discountPercent > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({invoiceData.summary.discountPercent}%)</span>
                    <span>-₹{invoiceData.summary.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxable Amount</span>
                  <span>₹{invoiceData.summary.taxableAmount.toFixed(2)}</span>
                </div>
                {invoiceData.summary.gstRate > 0 && (
                  <div className="flex justify-between">
                    <span>GST ({invoiceData.summary.gstRate}%)</span>
                    <span>₹{invoiceData.summary.gstAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Grand Total</span>
                  <span>₹{invoiceData.summary.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
