import type { PlantSize } from "@/lib/plant-size";

export type PricingAdjustmentInput = {
  adjustmentType: string;
  amount: number | null;
  percent: number | null;
  reason: string | null;
};

export type PlantPriceLine = {
  adjustmentType: string;
  label: string;
  amount: number;
};

export type PlantPriceBreakdown = {
  size: PlantSize;
  baseAmount: number;
  lines: PlantPriceLine[];
  totalAmount: number;
};
