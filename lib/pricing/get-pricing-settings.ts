import type { PlantSize } from "@/lib/plant-size";
import { PLANT_SIZES, isPlantSize } from "@/lib/plant-size";
import { requireAdmin } from "@/lib/auth/require-admin";
import { DEFAULT_BASE_PRICES, DEFAULT_BUGS_SURCHARGE_PERCENT } from "@/lib/pricing/defaults";
import { isShopifyPricingConfigured } from "@/lib/shopify/env";
import { SHOPIFY_VARIANT_IDS } from "@/lib/shopify/config";
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
  shopifyConfigured: boolean;
  shopifySyncedAt: string | null;
  basePrices: Record<PlantSize, PricingRuleRef>;
  pestsPrices: Record<PlantSize, number | null>;
  shopifySizeLabels: Record<PlantSize, string>;
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
    .select("id, size, rule_type, amount, percent, pests_amount, shopify_synced_at")
    .eq("active", true)
    .in("rule_type", ["base_price", "bugs_surcharge"]);

  if (error) {
    throw new Error(`Failed to load pricing settings: ${error.message}`);
  }

  const basePrices = Object.fromEntries(
    PLANT_SIZES.map((size) => [size, { ruleId: null as string | null, amount: DEFAULT_BASE_PRICES[size] }]),
  ) as Record<PlantSize, PricingRuleRef>;

  const pestsPrices = Object.fromEntries(PLANT_SIZES.map((size) => [size, null])) as Record<
    PlantSize,
    number | null
  >;

  let bugsSurcharge: PricingPercentRuleRef = {
    ruleId: null,
    percent: DEFAULT_BUGS_SURCHARGE_PERCENT,
  };

  let shopifySyncedAt: string | null = null;

  for (const row of data ?? []) {
    if (row.rule_type === "base_price" && row.size && isPlantSize(row.size)) {
      basePrices[row.size] = {
        ruleId: row.id,
        amount: Number(row.amount),
      };

      pestsPrices[row.size] = row.pests_amount != null ? Number(row.pests_amount) : null;

      if (row.shopify_synced_at) {
        const rowSync = String(row.shopify_synced_at);
        if (!shopifySyncedAt || rowSync > shopifySyncedAt) {
          shopifySyncedAt = rowSync;
        }
      }
    }

    if (row.rule_type === "bugs_surcharge") {
      bugsSurcharge = {
        ruleId: row.id,
        percent: Number(row.percent),
      };
    }
  }

  const shopifySizeLabels = Object.fromEntries(
    PLANT_SIZES.map((size) => [size, SHOPIFY_VARIANT_IDS[size].shopifySizeLabel]),
  ) as Record<PlantSize, string>;

  return {
    shopifyConfigured: isShopifyPricingConfigured(),
    shopifySyncedAt,
    basePrices,
    pestsPrices,
    shopifySizeLabels,
    bugsSurcharge,
  };
}
