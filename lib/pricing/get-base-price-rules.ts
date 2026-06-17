import type { PlantSize } from "@/lib/plant-size";
import { PLANT_SIZES, isPlantSize } from "@/lib/plant-size";
import { DEFAULT_BASE_PRICES } from "@/lib/pricing/defaults";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type BasePriceRules = Record<PlantSize, number>;

/** Active base prices from pricing_rules (admin read), with HIL-9 defaults for missing sizes. */
export async function getBasePriceRules(): Promise<BasePriceRules> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("pricing_rules")
    .select("size, amount")
    .eq("rule_type", "base_price")
    .eq("active", true);

  if (error) {
    throw new Error(`Failed to load base price rules: ${error.message}`);
  }

  const rules: BasePriceRules = { ...DEFAULT_BASE_PRICES };

  for (const row of data ?? []) {
    if (row.size && isPlantSize(row.size)) {
      rules[row.size] = Number(row.amount);
    }
  }

  return rules;
}

export function getBasePriceForSize(rules: BasePriceRules, size: PlantSize): number {
  return rules[size];
}

export function basePriceRuleSizes(): PlantSize[] {
  return [...PLANT_SIZES];
}
