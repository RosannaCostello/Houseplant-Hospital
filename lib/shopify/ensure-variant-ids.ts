import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlantSize } from "@/lib/plant-size";
import { PLANT_SIZES } from "@/lib/plant-size";
import { DEFAULT_BASE_PRICES } from "@/lib/pricing/defaults";
import { getCanonicalBasePriceRuleId } from "@/lib/pricing/canonical-base-price-rule";
import { SHOPIFY_VARIANT_IDS } from "@/lib/shopify/config";

/** Ensure each size has one active base_price row with Shopify variant IDs. */
export async function ensureShopifyVariantIdsOnRules(supabase: SupabaseClient): Promise<void> {
  for (const size of PLANT_SIZES) {
    const mapping = SHOPIFY_VARIANT_IDS[size];

    let ruleId: string | null;

    try {
      ruleId = await getCanonicalBasePriceRuleId(supabase, size);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("shopify_variant_id") || message.includes("pests_amount")) {
        throw new Error(
          "Shopify pricing columns are missing. Run migration 0009_shopify_pricing_hil52.sql in Supabase.",
        );
      }
      throw error;
    }

    if (ruleId) {
      const { error: updateError } = await supabase
        .from("pricing_rules")
        .update({
          shopify_variant_id: mapping.standardVariantId,
          shopify_pests_variant_id: mapping.pestsVariantId,
        })
        .eq("id", ruleId);

      if (updateError) {
        throw new Error(`Failed to set Shopify variant IDs for ${size}: ${updateError.message}`);
      }
      continue;
    }

    const { error: insertError } = await supabase.from("pricing_rules").insert({
      size,
      rule_type: "base_price",
      amount: DEFAULT_BASE_PRICES[size],
      percent: 0,
      active: true,
      shopify_variant_id: mapping.standardVariantId,
      shopify_pests_variant_id: mapping.pestsVariantId,
    });

    if (insertError) {
      throw new Error(`Failed to create pricing rule for ${size}: ${insertError.message}`);
    }
  }
}

export type VariantPriceTarget = {
  size: PlantSize;
  kind: "standard" | "pests";
  variantId: string;
};

export function shopifyVariantPriceTargets(): VariantPriceTarget[] {
  return PLANT_SIZES.flatMap((size) => {
    const mapping = SHOPIFY_VARIANT_IDS[size];
    return [
      { size, kind: "standard" as const, variantId: mapping.standardVariantId },
      { size, kind: "pests" as const, variantId: mapping.pestsVariantId },
    ];
  });
}
