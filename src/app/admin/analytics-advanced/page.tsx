'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import { AdvancedAnalyticsCharts } from '@/components/advanced-analytics-charts';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  RefreshCw,
  UserCheck,
  UserPlus,
  ShoppingCart,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CLVSummary, CohortAnalysis, AdvancedAnalyticsSummary, RFMSummary } from '@/types/analytics';

interface AnalyticsData {
  summary: AdvancedAnalyticsSummary | null;
  clv: CLVSummary | null;
  cohorts: CohortAnalysis | null;
  rfm: RFMSummary | null;
}

export default function AdvancedAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    summary: null,
    clv: null,
    cohorts: null,
    rfm: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, clvRes, cohortsRes] = await Promise.all([
        fetch('/api/admin/analytics/summary'),
        fetch('/api/admin/analytics/clv'),
        fetch('/api/admin/analytics/cohorts'),
      ]);

      const [summaryData, clvData, cohortsData] = await Promise.all([
        summaryRes.json(),
        clvRes.json(),
        cohortsRes.json(),
      ]);

      if (!summaryRes.ok || !clvRes.ok || !cohortsRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      setData({
        summary: summaryData.data,
        clv: clvData.data,
        cohorts: cohortsData.data,
        rfm: summaryData.data?.rfm || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const { summary, clv, cohorts, rfm } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <AdminNavigation />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Advanced Analytics</h2>
            <p className="text-gray-600">Customer Lifetime Value, Cohort Analysis, and RFM Metrics</p>
          </div>
          <Button 
            onClick={fetchData} 
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="py-4">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {loading && !summary && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
            <span className="ml-2 text-gray-600">Loading analytics...</span>
          </div>
        )}

        {summary && (
          <>
            {/* Summary Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Customers
                  </CardTitle>
                  <Users className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.totalCustomers}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    +{summary.newCustomersThisMonth} this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Average CLV
                  </CardTitle>
                  <Target className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{summary.averageCLV.toFixed(0)}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Lifetime value estimate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Monthly Recurring Revenue
                  </CardTitle>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{summary.monthlyRecurringRevenue.toFixed(0)}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    From active subscriptions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Churn Rate
                  </CardTitle>
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.churnRate.toFixed(1)}%</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.retentionRate.toFixed(1)}% retention
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Active Customers
                  </CardTitle>
                  <UserCheck className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.activeCustomers}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Ordered in last 90 days
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Stats */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Avg Order Value
                  </CardTitle>
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">₹{summary.averageOrderValue.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Orders/Customer
                  </CardTitle>
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{summary.averageOrdersPerCustomer.toFixed(1)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    New This Month
                  </CardTitle>
                  <UserPlus className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{summary.newCustomersThisMonth}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Lifetime Revenue Projection
                  </CardTitle>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">₹{(summary.lifetimeRevenueProjection / 1000).toFixed(0)}k</div>
                </CardContent>
              </Card>
            </div>

            {/* CLV Summary Cards */}
            {clv && (
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">CLV Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average CLV</span>
                      <span className="font-semibold">₹{clv.averageCLV.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Median CLV</span>
                      <span className="font-semibold">₹{clv.medianCLV.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Revenue</span>
                      <span className="font-semibold">₹{clv.totalRevenue.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Top Customers by CLV</CardTitle>
                    <CardDescription>Highest value customers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {clv.topCustomers.slice(0, 5).map((customer, index) => (
                        <div key={customer.userId} className="flex justify-between items-center py-1 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                            <div>
                              <p className="font-medium">{customer.name || customer.email}</p>
                              <p className="text-xs text-gray-500">{customer.orderCount} orders</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">₹{customer.clvEstimate.toFixed(0)}</p>
                            <p className="text-xs text-gray-500">₹{customer.totalRevenue.toFixed(0)} spent</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts */}
            <AdvancedAnalyticsCharts 
              cohortData={cohorts || undefined}
              clvData={clv || undefined}
              rfmData={rfm || undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}
