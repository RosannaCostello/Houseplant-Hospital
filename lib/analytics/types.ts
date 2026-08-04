import type { PlantStatus } from "@/lib/plant-status";

export type AnalyticsBucket = "day" | "week" | "month";

export type AnalyticsPeriodSummary = {
  plantsCheckedIn: number;
  plantsCollected: number;
  treatmentRevenue: number;
  pricedCollectedPlants: number;
  medianTurnaroundDays: number | null;
  averageValuePerCollectedPlant: number | null;
  /** Avg minutes in in_surgery for stints that ended in the period (app data only). */
  averageMinutesInSurgery: number | null;
  uniqueCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  pestsFound: number;
  pestsAssessed: number;
  pestsUnassessed: number;
  propagations: number;
};

export type AnalyticsSeriesPoint = {
  bucket: string;
  checkedIn: number;
  collected: number;
  revenue: number;
};

export type AnalyticsCountBreakdown = {
  count: number;
};

export type AnalyticsSizeBreakdown = AnalyticsCountBreakdown & {
  size: string;
};

export type AnalyticsLaneSnapshot = AnalyticsCountBreakdown & {
  status: PlantStatus;
  medianAgeDays: number | null;
};

export type AnalyticsOldestPlant = {
  plantId: string;
  customerName: string;
  plantName: string | null;
  status: PlantStatus;
  ageDays: number;
};

export type AnalyticsPaymentSnapshot = AnalyticsCountBreakdown & {
  status: string;
};

export type AnalyticsDraftSnapshot = AnalyticsCountBreakdown & {
  step: string;
};

export type AdminAnalytics = {
  range: {
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
    bucket: AnalyticsBucket;
    timezone: "Europe/London";
    generatedAt: string;
  };
  current: AnalyticsPeriodSummary;
  previous: AnalyticsPeriodSummary;
  series: AnalyticsSeriesPoint[];
  previousSeries: AnalyticsSeriesPoint[];
  sizeBreakdown: AnalyticsSizeBreakdown[];
  laneSnapshot: AnalyticsLaneSnapshot[];
  oldestActive: AnalyticsOldestPlant[];
  paymentSnapshot: AnalyticsPaymentSnapshot[];
  draftSnapshot: AnalyticsDraftSnapshot[];
};
