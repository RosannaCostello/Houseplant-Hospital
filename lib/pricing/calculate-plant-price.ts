import type { PlantSize } from "@/lib/plant-size";
import { roundMoney } from "@/lib/pricing/round-money";
import type { PlantPriceBreakdown, PlantPriceLine, PricingAdjustmentInput } from "@/lib/pricing/types";

const ADJUSTMENT_LABELS: Record<string, string> = {
  bugs_surcharge: "Bugs surcharge",
};

function adjustmentLabel(adjustment: PricingAdjustmentInput): string {
  if (adjustment.reason?.trim()) {
    return adjustment.reason.trim();
  }

  return ADJUSTMENT_LABELS[adjustment.adjustmentType] ?? adjustment.adjustmentType;
}

function lineFromAdjustment(
  baseAmount: number,
  adjustment: PricingAdjustmentInput,
): PlantPriceLine | null {
  if (adjustment.percent != null && adjustment.percent !== 0) {
    return {
      adjustmentType: adjustment.adjustmentType,
      label: adjustmentLabel(adjustment),
      amount: roundMoney(baseAmount * (Number(adjustment.percent) / 100)),
    };
  }

  if (adjustment.amount != null && adjustment.amount !== 0) {
    return {
      adjustmentType: adjustment.adjustmentType,
      label: adjustmentLabel(adjustment),
      amount: roundMoney(Number(adjustment.amount)),
    };
  }

  return null;
}

function linesFromPricingModifier(baseAmount: number, pricingModifier: number): PlantPriceLine[] {
  if (pricingModifier <= 0) {
    return [];
  }

  return [
    {
      adjustmentType: "pricing_modifier",
      label: "Pricing modifier",
      amount: roundMoney(baseAmount * pricingModifier),
    },
  ];
}

export function calculatePlantPrice(input: {
  size: PlantSize;
  baseAmount: number;
  pricingModifier?: number;
  adjustments?: PricingAdjustmentInput[];
}): PlantPriceBreakdown {
  const baseAmount = roundMoney(input.baseAmount);
  const adjustments = input.adjustments ?? [];
  const pricingModifier = input.pricingModifier ?? 0;

  const lines =
    adjustments.length > 0
      ? adjustments
          .map((adjustment) => lineFromAdjustment(baseAmount, adjustment))
          .filter((line): line is PlantPriceLine => line != null)
      : linesFromPricingModifier(baseAmount, pricingModifier);

  const adjustmentTotal = roundMoney(lines.reduce((sum, line) => sum + line.amount, 0));

  return {
    size: input.size,
    baseAmount,
    lines,
    totalAmount: roundMoney(baseAmount + adjustmentTotal),
  };
}
