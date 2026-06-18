import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlantSize } from "@/lib/plant-size";
import { PLANT_SIZES } from "@/lib/plant-size";
import { requireAdmin } from "@/lib/auth/require-admin";
import { roundMoney } from "@/lib/pricing/round-money";
import { isShopifyPricingConfigured } from "@/lib/shopify/env";

export type UpdatePricingSettingsInput = {
  basePrices?: Record<PlantSize, number>;
  bugsSurchargePercent: number;
};

export type UpdatePricingSettingsResult =
  | { success: true }
  | { success: false; error: string };

function isValidPrice(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}

export async function updatePricingSettingsWithClient(
  supabase: SupabaseClient,
  input: UpdatePricingSettingsInput,
): Promise<UpdatePricingSettingsResult> {
  const admin = await requireAdmin(supabase);
  if (!admin.ok) {
    return { success: false, error: admin.error };
  }

  const shopifyConfigured = isShopifyPricingConfigured();

  if (!shopifyConfigured && input.basePrices) {
    for (const size of PLANT_SIZES) {
      const amount = roundMoney(input.basePrices[size]);
      if (!isValidPrice(amount)) {
        return { success: false, error: `Invalid price for size ${size}.` };
      }
    }
  }

  if (shopifyConfigured && input.basePrices) {
    return {
      success: false,
      error: "Base prices are synced from Shopify. Use Sync from Shopify instead.",
    };
  }

  const bugsPercent = Number(input.bugsSurchargePercent);
  if (!Number.isFinite(bugsPercent) || bugsPercent < 0) {
    return { success: false, error: "Bugs surcharge percent must be zero or greater." };
  }

  const { data: rules, error: rulesError } = await supabase
    .from("pricing_rules")
    .select("id, size, rule_type")
    .eq("active", true)
    .in("rule_type", ["base_price", "bugs_surcharge"]);

  if (rulesError) {
    return { success: false, error: rulesError.message };
  }

  const baseRuleIds = new Map<PlantSize, string>();
  let bugsRuleId: string | null = null;

  for (const rule of rules ?? []) {
    if (rule.rule_type === "base_price" && rule.size && PLANT_SIZES.includes(rule.size as PlantSize)) {
      baseRuleIds.set(rule.size as PlantSize, rule.id);
    }
    if (rule.rule_type === "bugs_surcharge") {
      bugsRuleId = rule.id;
    }
  }

  if (!shopifyConfigured && input.basePrices) {
    for (const size of PLANT_SIZES) {
      const amount = roundMoney(input.basePrices[size]);
      const ruleId = baseRuleIds.get(size);

      if (ruleId) {
        const { error } = await supabase
          .from("pricing_rules")
          .update({ amount })
          .eq("id", ruleId);

        if (error) {
          return { success: false, error: error.message };
        }
      } else {
        const { error } = await supabase.from("pricing_rules").insert({
          size,
          rule_type: "base_price",
          amount,
          percent: 0,
          active: true,
        });

        if (error) {
          return { success: false, error: error.message };
        }
      }
    }
  }

  if (bugsRuleId) {
    const { error } = await supabase
      .from("pricing_rules")
      .update({ percent: bugsPercent, amount: 0 })
      .eq("id", bugsRuleId);

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await supabase.from("pricing_rules").insert({
      size: null,
      rule_type: "bugs_surcharge",
      amount: 0,
      percent: bugsPercent,
      active: true,
    });

    if (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}
