// Customer Lifetime Value (CLV) Analytics Types

export interface CustomerCLV {
  userId: string;
  email: string;
  name: string | null;
  totalRevenue: number;
  orderCount: number;
  subscriptionCount: number;
  averageOrderValue: number;
  recency: number; // Days since last order
  frequency: number; // Orders per month
  lifetimeDuration: number; // Days since first order
  clvEstimate: number;
  lastOrderDate: Date | null;
  firstOrderDate: Date | null;
  createdAt: Date;
}

export interface CLVSummary {
  topCustomers: CustomerCLV[];
  averageCLV: number;
  totalCustomers: number;
  totalRevenue: number;
  medianCLV: number;
  clvDistribution: CLVDistributionBucket[];
}

export interface CLVDistributionBucket {
  range: string;
  min: number;
  max: number;
  count: number;
}

// Cohort Analysis Types

export interface CohortData {
  cohortMonth: string; // e.g., "2024-01"
  customerCount: number;
  totalRevenue: number;
  averageOrderCount: number;
  retentionByMonth: CohortRetention[];
}

export interface CohortRetention {
  monthIndex: number; // 0 = signup month, 1 = first month after, etc.
  activeCustomers: number;
  retentionRate: number;
  revenue: number;
}

export interface CohortAnalysis {
  cohorts: CohortData[];
  overallRetentionCurve: { month: number; averageRetention: number }[];
  revenuePerCohort: { cohortMonth: string; monthlyRevenue: { month: string; revenue: number }[] }[];
}

// RFM (Recency, Frequency, Monetary) Analysis Types

export interface RFMScore {
  userId: string;
  email: string;
  name: string | null;
  recency: number; // Days since last order
  frequency: number; // Total orders
  monetary: number; // Total spend
  recencyScore: number; // 1-5
  frequencyScore: number; // 1-5
  monetaryScore: number; // 1-5
  rfmScore: string; // Combined score e.g., "555"
  segment: string; // e.g., "Champions", "At Risk", etc.
}

export interface RFMSummary {
  customers: RFMScore[];
  segmentDistribution: { segment: string; count: number; percentage: number }[];
  rfmHeatmap: RFMHeatmapCell[];
}

export interface RFMHeatmapCell {
  recencyScore: number;
  frequencyScore: number;
  averageMonetary: number;
  customerCount: number;
}

// Summary Analytics Types

export interface AdvancedAnalyticsSummary {
  totalCustomers: number;
  averageCLV: number;
  monthlyRecurringRevenue: number;
  churnRate: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  retentionRate: number;
  averageOrderValue: number;
  averageOrdersPerCustomer: number;
  lifetimeRevenueProjection: number;
}

// API Response Types

export interface CLVApiResponse {
  success: boolean;
  data?: CLVSummary;
  error?: string;
}

export interface CohortApiResponse {
  success: boolean;
  data?: CohortAnalysis;
  error?: string;
}

export interface SummaryApiResponse {
  success: boolean;
  data?: AdvancedAnalyticsSummary;
  error?: string;
}

export interface RFMApiResponse {
  success: boolean;
  data?: RFMSummary;
  error?: string;
}
