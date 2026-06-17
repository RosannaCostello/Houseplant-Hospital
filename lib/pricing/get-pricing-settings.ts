import type { PlantSize } from "@/lib/plant-size";
import { PLANT_SIZES, isPlantSize } from "@/lib/plant-size";
import { requireAdmin } from "@/lib/auth/require-admin";
import { DEFAULT_BASE_PRICES, DEFAULT_BUGS_SURCHARGE_PERCENT } from "@/lib/pricing/defaults";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PricingRuleRef = {
  ruleId: string | null;
  amount: number;
};

export type PricingPercentRuleRef = {
  ruleId: string | null;
  percent: number;
};

export type PricingSettings = {
  basePrices: Record<PlantSize, PricingRuleRef>;
  bugsSurcharge: PricingPercentRuleRef;
};

/** Admin settings view of active pricing_rules rows (with ids for updates). */
export async function getPricingSettings(): Promise<PricingSettings> {
  const supabase = await createSupabaseServerClient();
  const auth = await requireAdmin(supabase);

  if (!auth.ok) {
    throw new Error(auth.error);
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("pricing_rules")
    .select("id, size, rule_type, amount, percent")
    .eq("active", true)
    .in("rule_type", ["base_price", "bugs_surcharge"]);

  if (error) {
    throw new Error(`Failed to load pricing settings: ${error.message}`);
  }

  const basePrices = Object.fromEntries(
    PLANT_SIZES.map((size) => [size, { ruleId: null as string | null, amount: DEFAULT_BASE_PRICES[size] }]),
  ) as Record<PlantSize, PricingRuleRef>;

  let bugsSurcharge: PricingPercentRuleRef = {
    ruleId: null,
    percent: DEFAULT_BUGS_SURCHARGE_PERCENT,
  };

  for (const row of data ?? []) {
    if (row.rule_type === "base_price" && row.size && isPlantSize(row.size)) {
      basePrices[row.size] = {
        ruleId: row.id,
        amount: Number(row.amount),
      };
    }

    if (row.rule_type === "bugs_surcharge") {
      bugsSurcharge = {
        ruleId: row.id,
        percent: Number(row.percent),
      };
    }
  }

  return { basePrices, bugsSurcharge };
}
