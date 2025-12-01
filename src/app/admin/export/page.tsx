'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, FileText, Users, Package, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Role } from '@/types';

export default function AdminExportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Order export filters
  const [orderFromDate, setOrderFromDate] = useState('');
  const [orderToDate, setOrderToDate] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');

  // Loading states
  const [exportingOrders, setExportingOrders] = useState(false);
  const [exportingCustomers, setExportingCustomers] = useState(false);
  const [exportingInventory, setExportingInventory] = useState(false);
  const [exportingAnalytics, setExportingAnalytics] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.role !== Role.ADMIN) {
      router.push('/');
      return;
    }
  }, [status, session, router]);

  const handleExportOrders = async () => {
    setExportingOrders(true);
    try {
      const params = new URLSearchParams();
      if (orderFromDate) params.append('from', orderFromDate);
      if (orderToDate) params.append('to', orderToDate);
      if (orderStatus !== 'all') params.append('status', orderStatus);
      if (paymentStatus !== 'all') params.append('paymentStatus', paymentStatus);

      const response = await fetch(`/api/admin/export/orders?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to export orders');
      }

      // Get the blob and download it
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Orders exported successfully');
    } catch (error) {
      console.error('Error exporting orders:', error);
      toast.error('Failed to export orders');
    } finally {
      setExportingOrders(false);
    }
  };

  const handleExportCustomers = async () => {
    setExportingCustomers(true);
    try {
      const response = await fetch('/api/admin/export/customers');
      
      if (!response.ok) {
        throw new Error('Failed to export customers');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Customers exported successfully');
    } catch (error) {
      console.error('Error exporting customers:', error);
      toast.error('Failed to export customers');
    } finally {
      setExportingCustomers(false);
    }
  };

  const handleExportInventory = async () => {
    setExportingInventory(true);
    try {
      const response = await fetch('/api/admin/export/inventory');
      
      if (!response.ok) {
        throw new Error('Failed to export inventory');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Inventory exported successfully');
    } catch (error) {
      console.error('Error exporting inventory:', error);
      toast.error('Failed to export inventory');
    } finally {
      setExportingInventory(false);
    }
  };

  const handleExportAnalytics = async () => {
    setExportingAnalytics(true);
    try {
      const response = await fetch('/api/admin/export/analytics');
      
      if (!response.ok) {
        throw new Error('Failed to export analytics');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Analytics exported successfully');
    } catch (error) {
      console.error('Error exporting analytics:', error);
      toast.error('Failed to export analytics');
    } finally {
      setExportingAnalytics(false);
    }
  };

  if (status === 'loading') {
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

        <h2 className="text-2xl font-semibold mb-2">Data Export</h2>
        <p className="text-gray-600 mb-6">Export your data to CSV files for reporting and analysis</p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Orders Export */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                <CardTitle>Export Orders</CardTitle>
              </div>
              <CardDescription>
                Export orders with optional date range and status filters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromDate">From Date</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={orderFromDate}
                    onChange={(e) => setOrderFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDate">To Date</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={orderToDate}
                    onChange={(e) => setOrderToDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Order Status</Label>
                  <Select value={orderStatus} onValueChange={setOrderStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
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
                </div>

                <div className="space-y-2">
                  <Label>Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Payments" />
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
              </div>

              <Button
                onClick={handleExportOrders}
                disabled={exportingOrders}
                className="w-full"
              >
                {exportingOrders ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Orders to CSV
              </Button>
            </CardContent>
          </Card>

          {/* Customers Export */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <CardTitle>Export Customers</CardTitle>
              </div>
              <CardDescription>
                Export customer list with signup date, total orders, and total spent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                This export includes all customers with their order history summary.
                Data includes: name, email, phone, signup date, total orders, and total amount spent.
              </p>

              <Button
                onClick={handleExportCustomers}
                disabled={exportingCustomers}
                className="w-full"
              >
                {exportingCustomers ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Customers to CSV
              </Button>
            </CardContent>
          </Card>

          {/* Inventory Export */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                <CardTitle>Export Inventory</CardTitle>
              </div>
              <CardDescription>
                Export current stock levels for all products
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                This export includes all products with their current stock levels.
                Data includes: product name, category, price, stock quantity, availability status.
              </p>

              <Button
                onClick={handleExportInventory}
                disabled={exportingInventory}
                className="w-full"
              >
                {exportingInventory ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Inventory to CSV
              </Button>
            </CardContent>
          </Card>

          {/* Analytics Export */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <CardTitle>Export Analytics</CardTitle>
              </div>
              <CardDescription>
                Export monthly sales summary and analytics data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                This export includes the last 6 months of analytics data.
                Data includes: monthly revenue, order count, average order value, top products, subscription count.
              </p>

              <Button
                onClick={handleExportAnalytics}
                disabled={exportingAnalytics}
                className="w-full"
              >
                {exportingAnalytics ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Analytics to CSV
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Export Info */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              <CardTitle>Order Invoices (PDF)</CardTitle>
            </div>
            <CardDescription>
              Generate PDF invoices for individual orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              To download an invoice for a specific order, go to the{' '}
              <a href="/admin/orders" className="text-green-600 hover:underline font-medium">
                Orders page
              </a>
              , view the order details, and click the &quot;Download Invoice&quot; button.
              The invoice will open in a new tab where you can print or save it as PDF.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
