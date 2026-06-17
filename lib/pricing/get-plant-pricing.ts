import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlantSize } from "@/lib/plant-size";
import { calculatePlantPrice } from "@/lib/pricing/calculate-plant-price";
import { getBasePriceForSize, getBasePriceRules } from "@/lib/pricing/get-base-price-rules";
import type { PlantPriceBreakdown } from "@/lib/pricing/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PricingAdjustmentRow = {
  adjustment_type: string;
  amount: number | null;
  percent: number | null;
  reason: string | null;
};

function mapAdjustments(rows: PricingAdjustmentRow[]) {
  return rows.map((row) => ({
    adjustmentType: row.adjustment_type,
    amount: row.amount,
    percent: row.percent,
    reason: row.reason,
  }));
}

export async function getPlantPricingWithClient(
  supabase: SupabaseClient,
  plantId: string,
  basePriceRules?: Awaited<ReturnType<typeof getBasePriceRules>>,
): Promise<PlantPriceBreakdown | null> {
  const [rules, plantResult, adjustmentsResult] = await Promise.all([
    basePriceRules ?? getBasePriceRules(),
    supabase
      .from("plants")
      .select("size, pricing_modifier")
      .eq("id", plantId)
      .maybeSingle(),
    supabase
      .from("pricing_adjustments")
      .select("adjustment_type, amount, percent, reason")
      .eq("plant_id", plantId)
      .order("created_at", { ascending: true }),
  ]);

  if (plantResult.error) {
    throw new Error(`Failed to load plant for pricing: ${plantResult.error.message}`);
  }

  if (adjustmentsResult.error) {
    throw new Error(`Failed to load pricing adjustments: ${adjustmentsResult.error.message}`);
  }

  const plant = plantResult.data;
  if (!plant?.size || !isPlantSize(plant.size)) {
    return null;
  }

  const baseAmount = getBasePriceForSize(rules, plant.size);

  return calculatePlantPrice({
    size: plant.size,
    baseAmount,
    pricingModifier: Number(plant.pricing_modifier),
    adjustments: mapAdjustments(adjustmentsResult.data ?? []),
  });
}

export async function getPlantPricing(plantId: string): Promise<PlantPriceBreakdown | null> {
  const supabase = await createSupabaseServerClient();
  return getPlantPricingWithClient(supabase, plantId);
}
