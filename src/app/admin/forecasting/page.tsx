'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Package,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Role } from '@/types';

interface ForecastData {
  id: string;
  productId: string;
  forecastDate: string;
  expectedQuantity: number;
  recommendedReorderQty: number;
  createdAt: string;
  product: {
    id: string;
    name: string;
    category: string;
    stock: number;
    isAvailable: boolean;
    isSeasonal: boolean;
    price: number;
  };
}

export default function ForecastingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchForecasts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/forecasting');
      if (response.ok) {
        const data = await response.json();
        setForecasts(data.forecasts || []);
      }
    } catch (error) {
      console.error('Error fetching forecasts:', error);
      toast.error('Failed to load forecasts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (session?.user?.role !== Role.ADMIN) {
      router.push('/');
      return;
    }
    fetchForecasts();
  }, [session, status, router, fetchForecasts]);

  const generateForecasts = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/forecasting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookbackMonths: 6, forecastDays: 30 }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        await fetchForecasts();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to generate forecasts');
      }
    } catch (error) {
      console.error('Error generating forecasts:', error);
      toast.error('Failed to generate forecasts');
    } finally {
      setGenerating(false);
    }
  };

  // Calculate summary stats
  const lowStockAlerts = forecasts.filter(
    f => f.product.stock < f.recommendedReorderQty && f.recommendedReorderQty > 0
  );
  const totalExpectedDemand = forecasts.reduce((sum, f) => sum + f.expectedQuantity, 0);
  const totalReorderNeeded = forecasts.reduce((sum, f) => sum + f.recommendedReorderQty, 0);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <AdminNavigation />
          <div className="flex items-center justify-center py-12">
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Inventory Forecasting</h2>
            <p className="text-gray-600">Demand prediction and reorder recommendations</p>
          </div>
          <Button
            onClick={generateForecasts}
            disabled={generating}
            className="bg-green-600 hover:bg-green-700"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate Forecasts
              </>
            )}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Products
              </CardTitle>
              <Package className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{forecasts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Expected Demand (30d)
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalExpectedDemand}</div>
              <p className="text-xs text-gray-500">units</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Reorder Needed
              </CardTitle>
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReorderNeeded}</div>
              <p className="text-xs text-gray-500">units to order</p>
            </CardContent>
          </Card>

          <Card className={lowStockAlerts.length > 0 ? 'border-red-200 bg-red-50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Low Stock Alerts
              </CardTitle>
              <AlertTriangle className={`h-5 w-5 ${lowStockAlerts.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lowStockAlerts.length > 0 ? 'text-red-600' : ''}`}>
                {lowStockAlerts.length}
              </div>
              <p className="text-xs text-gray-500">products need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts Section */}
        {lowStockAlerts.length > 0 && (
          <Card className="mb-6 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>
                These products have stock below the recommended reorder quantity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lowStockAlerts.map((forecast) => (
                  <Badge
                    key={forecast.id}
                    variant="destructive"
                    className="py-1 px-3"
                  >
                    {forecast.product.name}: {forecast.product.stock} in stock, need {forecast.recommendedReorderQty}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Forecast Table */}
        <Card>
          <CardHeader>
            <CardTitle>Product Forecasts</CardTitle>
            <CardDescription>
              Forecasted demand for the next 30 days based on historical sales data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forecasts.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No forecasts yet</h3>
                <p className="text-gray-500 mb-4">
                  Click the Generate Forecasts button to create demand predictions
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Current Stock</TableHead>
                    <TableHead className="text-center">Expected Demand</TableHead>
                    <TableHead className="text-center">Reorder Qty</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Seasonal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecasts.map((forecast) => {
                    const isLowStock = forecast.product.stock < forecast.recommendedReorderQty && forecast.recommendedReorderQty > 0;
                    const stockCoverage = forecast.expectedQuantity > 0
                      ? Math.round((forecast.product.stock / forecast.expectedQuantity) * 100)
                      : 100;

                    return (
                      <TableRow
                        key={forecast.id}
                        className={`${isLowStock ? 'bg-red-50' : ''} cursor-pointer hover:bg-gray-100`}
                        onClick={() => router.push('/admin/inventory-warehouse')}
                      >
                        <TableCell className="font-medium">
                          {forecast.product.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {forecast.product.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={isLowStock ? 'text-red-600 font-semibold' : ''}>
                            {forecast.product.stock}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {forecast.expectedQuantity}
                        </TableCell>
                        <TableCell className="text-center">
                          {forecast.recommendedReorderQty > 0 ? (
                            <span className="font-semibold text-orange-600">
                              +{forecast.recommendedReorderQty}
                            </span>
                          ) : (
                            <span className="text-green-600">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isLowStock ? (
                            <Badge variant="destructive">
                              Low Stock
                            </Badge>
                          ) : stockCoverage >= 100 ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              OK
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                              {stockCoverage}% coverage
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {forecast.product.isSeasonal && (
                            <Badge variant="secondary">Seasonal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
