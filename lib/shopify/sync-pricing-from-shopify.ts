import "server-only";

import type { PlantSize } from "@/lib/plant-size";
import { PLANT_SIZES, isPlantSize } from "@/lib/plant-size";
import { DEFAULT_BASE_PRICES } from "@/lib/pricing/defaults";
import { fetchShopifyVariantPrices } from "@/lib/shopify/fetch-variant-prices";
import {
  ensureShopifyVariantIdsOnRules,
  shopifyVariantPriceTargets,
} from "@/lib/shopify/ensure-variant-ids";
import { SHOPIFY_VARIANT_IDS } from "@/lib/shopify/config";
import { isShopifyPricingConfigured } from "@/lib/shopify/env";
import { getCanonicalBasePriceRuleId } from "@/lib/pricing/canonical-base-price-rule";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SyncShopifyPricingResult =
  | { success: true; syncedAt: string; sizesUpdated: number }
  | { success: false; error: string };

type SizePricePatch = {
  amount?: number;
  pests_amount?: number;
};

export async function syncPricingFromShopify(): Promise<SyncShopifyPricingResult> {
  if (!isShopifyPricingConfigured()) {
    return { success: false, error: "Shopify is not configured." };
  }

  const supabase = createSupabaseAdminClient();

  try {
    await ensureShopifyVariantIdsOnRules(supabase);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not prepare pricing rules.";
    return { success: false, error: message };
  }

  const targets = shopifyVariantPriceTargets();
  const variantIds = targets.map((target) => target.variantId);

  try {
    const prices = await fetchShopifyVariantPrices(variantIds);
    const syncedAt = new Date().toISOString();
    const patches = Object.fromEntries(
      PLANT_SIZES.map((size) => [size, {} as SizePricePatch]),
    ) as Record<PlantSize, SizePricePatch>;

    const missingPrices: string[] = [];

    for (const target of targets) {
      const price = prices.get(target.variantId);
      if (price == null) {
        missingPrices.push(`${target.size} ${target.kind} (${target.variantId})`);
        continue;
      }

      if (target.kind === "standard") {
        patches[target.size].amount = price;
      } else {
        patches[target.size].pests_amount = price;
      }
    }

    if (missingPrices.length > 0) {
      return {
        success: false,
        error: `Shopify did not return prices for: ${missingPrices.join(", ")}. Check variant IDs in Settings or lib/shopify/config.ts.`,
      };
    }

    let sizesUpdated = 0;

    for (const size of PLANT_SIZES) {
      const patch = patches[size];
      const mapping = SHOPIFY_VARIANT_IDS[size];

      let ruleId: string | null;

      try {
        ruleId = await getCanonicalBasePriceRuleId(supabase, size);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load pricing rule.";
        return { success: false, error: message };
      }

      const row = {
        shopify_synced_at: syncedAt,
        shopify_variant_id: mapping.standardVariantId,
        shopify_pests_variant_id: mapping.pestsVariantId,
        amount: patch.amount ?? DEFAULT_BASE_PRICES[size],
        pests_amount: patch.pests_amount ?? null,
      };

      if (ruleId) {
        const { error } = await supabase.from("pricing_rules").update(row).eq("id", ruleId);
        if (error) {
          if (error.message.includes("pests_amount")) {
            return {
              success: false,
              error:
                "pests_amount column is missing. Run migration 0009_shopify_pricing_hil52.sql in Supabase.",
            };
          }
          return { success: false, error: error.message };
        }
      } else {
        const { error } = await supabase.from("pricing_rules").insert({
          size,
          rule_type: "base_price",
          percent: 0,
          active: true,
          ...row,
        });
        if (error) {
          return { success: false, error: error.message };
        }
      }

      sizesUpdated += 1;
    }

    if (sizesUpdated === 0) {
      return { success: false, error: "No pricing rules were updated." };
    }

    return { success: true, syncedAt, sizesUpdated };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify sync failed";
    return { success: false, error: message };
  }
}

/** True when the last Shopify sync is older than 24 hours (or never run). */
export async function shouldRunDailyShopifySync(): Promise<boolean> {
  if (!isShopifyPricingConfigured()) return false;

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("pricing_rules")
    .select("shopify_synced_at")
    .eq("rule_type", "base_price")
    .eq("active", true)
    .not("shopify_synced_at", "is", null)
    .order("shopify_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.shopify_synced_at) {
    return true;
  }

  const lastSync = new Date(data.shopify_synced_at).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return Date.now() - lastSync >= dayMs;
}

export type PestsPriceRules = Record<PlantSize, number | null>;

export async function getPestsPriceRules(): Promise<PestsPriceRules> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("pricing_rules")
    .select("size, pests_amount")
    .eq("rule_type", "base_price")
    .eq("active", true);

  if (error) {
    throw new Error(`Failed to load pests price rules: ${error.message}`);
  }

  const rules = Object.fromEntries(PLANT_SIZES.map((size) => [size, null])) as PestsPriceRules;

  for (const row of data ?? []) {
    if (!row.size || !isPlantSize(row.size) || row.pests_amount == null) continue;

    const amount = Number(row.pests_amount);
    const existing = rules[row.size];

    // If duplicates exist, prefer the highest pests amount (canonical row after sync).
    if (existing == null || amount > existing) {
      rules[row.size] = amount;
    }
  }

  return rules;
}
