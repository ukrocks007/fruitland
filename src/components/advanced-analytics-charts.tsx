'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
} from 'recharts';
import { CohortAnalysis, CLVSummary, RFMSummary } from '@/types/analytics';

interface AdvancedChartsProps {
  cohortData?: CohortAnalysis;
  clvData?: CLVSummary;
  rfmData?: RFMSummary;
}

const COHORT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

const SEGMENT_COLORS: Record<string, string> = {
  'Champions': '#10b981',
  'Loyal Customers': '#3b82f6',
  'New Customers': '#8b5cf6',
  'Potential Loyalists': '#06b6d4',
  'Promising': '#14b8a6',
  'At Risk': '#f59e0b',
  'Need Attention': '#f97316',
  'Hibernating': '#6b7280',
  'Lost': '#ef4444',
  'Other': '#9ca3af',
};

export function AdvancedAnalyticsCharts({ cohortData, clvData, rfmData }: AdvancedChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Cohort Retention Curve */}
      {cohortData && cohortData.overallRetentionCurve.length > 0 && (
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Cohort Retention Curve</CardTitle>
            <CardDescription>Average customer retention rate over time since signup</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cohortData.overallRetentionCurve}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(value) => `Month ${value}`}
                />
                <YAxis 
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                  domain={[0, 100]}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Retention Rate']}
                  labelFormatter={(label) => `Month ${label} after signup`}
                />
                <Area
                  type="monotone"
                  dataKey="averageRetention"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                  name="Retention Rate"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Revenue Per Cohort Over Time */}
      {cohortData && cohortData.revenuePerCohort.length > 0 && (
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Revenue by Cohort Over Time</CardTitle>
            <CardDescription>Monthly revenue contribution from each customer cohort</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={cohortData.revenuePerCohort.slice(-6).flatMap((cohort) =>
                  cohort.monthlyRevenue.map((m) => ({
                    ...m,
                    cohort: cohort.cohortMonth,
                  }))
                ).reduce((acc, item) => {
                  const existing = acc.find((a) => a.month === item.month);
                  if (existing) {
                    existing[item.cohort] = item.revenue;
                  } else {
                    acc.push({ month: item.month, [item.cohort]: item.revenue });
                  }
                  return acc;
                }, [] as Record<string, number | string>[])}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Legend />
                {cohortData.revenuePerCohort.slice(-6).map((cohort, index) => (
                  <Bar
                    key={cohort.cohortMonth}
                    dataKey={cohort.cohortMonth}
                    stackId="revenue"
                    fill={COHORT_COLORS[index % COHORT_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* CLV Distribution Histogram */}
      {clvData && clvData.clvDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>CLV Distribution</CardTitle>
            <CardDescription>Customer count by lifetime value range</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clvData.clvDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Customers" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* RFM Segment Distribution */}
      {rfmData && rfmData.segmentDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Segments (RFM)</CardTitle>
            <CardDescription>Distribution of customers by RFM segment</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rfmData.segmentDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `${value.toFixed(0)}%`} />
                <YAxis type="category" dataKey="segment" width={120} />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'percentage') return `${value.toFixed(1)}%`;
                    return value;
                  }} 
                />
                <Bar dataKey="percentage" name="Percentage">
                  {rfmData.segmentDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={SEGMENT_COLORS[entry.segment] || '#6b7280'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* RFM Scatter/Heatmap */}
      {rfmData && rfmData.customers.length > 0 && (
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>RFM Analysis - Recency vs Frequency</CardTitle>
            <CardDescription>Customer distribution by recency (days since last order) and frequency (order count). Bubble size represents monetary value.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="recency" 
                  name="Recency (days)" 
                  domain={[0, 'auto']}
                />
                <YAxis 
                  type="number" 
                  dataKey="frequency" 
                  name="Frequency (orders)" 
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                          <p className="font-semibold">{data.email}</p>
                          <p>Recency: {data.recency} days</p>
                          <p>Frequency: {data.frequency} orders</p>
                          <p>Monetary: ₹{data.monetary.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">Segment: {data.segment}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Scatter
                  name="Customers"
                  data={rfmData.customers.slice(0, 100)}
                  fill="#3b82f6"
                >
                  {rfmData.customers.slice(0, 100).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={SEGMENT_COLORS[entry.segment] || '#6b7280'}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Customers by CLV */}
      {clvData && clvData.topCustomers.length > 0 && (
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Top 10 Customers by CLV</CardTitle>
            <CardDescription>Customers with highest estimated lifetime value</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={clvData.topCustomers.slice(0, 10).map((c) => ({
                  name: c.name || c.email.split('@')[0],
                  clv: c.clvEstimate,
                  totalRevenue: c.totalRevenue,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="clv" fill="#10b981" name="CLV Estimate" />
                <Bar dataKey="totalRevenue" fill="#3b82f6" name="Total Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
