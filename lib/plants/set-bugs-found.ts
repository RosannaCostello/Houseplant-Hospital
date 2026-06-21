import type { SupabaseClient } from "@supabase/supabase-js";
import { emitBugsFoundEvent } from "@/lib/mailchimp/emit-plant-event";
import { isPlantSize } from "@/lib/plant-size";
import { getBugsSurchargeRule } from "@/lib/pricing/get-bugs-surcharge-rule";
import { getBasePriceForSize, getBasePriceRules } from "@/lib/pricing/get-base-price-rules";
import { roundMoney } from "@/lib/pricing/round-money";
import { isShopifyPricingConfigured } from "@/lib/shopify/env";
import { getPestsPriceRules } from "@/lib/shopify/sync-pricing-from-shopify";

export type SetBugsFoundResult =
  | { success: true; bugsFound: boolean | null }
  | { success: false; error: string };

const BUGS_ADJUSTMENT_TYPE = "bugs_surcharge";

export async function setBugsFoundWithClient(
  supabase: SupabaseClient,
  plantId: string,
  bugsFound: boolean | null,
): Promise<SetBugsFoundResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to update bugs found." };
  }

  const { data: plant, error: fetchError } = await supabase
    .from("plants")
    .select("bugs_found, size")
    .eq("id", plantId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!plant) {
    return { success: false, error: "Plant not found." };
  }

  if (plant.bugs_found === bugsFound) {
    return { success: true, bugsFound };
  }

  if (bugsFound !== true) {
    const { error: updateError } = await supabase
      .from("plants")
      .update({
        bugs_found: bugsFound,
        pricing_modifier: 0,
      })
      .eq("id", plantId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const { error: clearError } = await supabase
      .from("pricing_adjustments")
      .delete()
      .eq("plant_id", plantId)
      .eq("adjustment_type", BUGS_ADJUSTMENT_TYPE);

    if (clearError) {
      await supabase
        .from("plants")
        .update({ bugs_found: plant.bugs_found, pricing_modifier: 0 })
        .eq("id", plantId);
      return { success: false, error: clearError.message };
    }

    return { success: true, bugsFound };
  }

  const shopifyPricing = isShopifyPricingConfigured();
  let surchargePercent = 0;
  let pestsLineAmount: number | null = null;

  if (plant.size && isPlantSize(plant.size)) {
    const [baseRules, pestsRules] = await Promise.all([getBasePriceRules(), getPestsPriceRules()]);
    const pestsAmount = pestsRules[plant.size];

    if (pestsAmount != null) {
      const baseAmount = getBasePriceForSize(baseRules, plant.size);
      pestsLineAmount = roundMoney(pestsAmount - baseAmount);
    }
  }

  if (shopifyPricing && pestsLineAmount == null) {
    return {
      success: false,
      error:
        "Pests prices are not synced from Shopify yet. Open Settings and run Sync from Shopify, then try again.",
    };
  }

  if (!shopifyPricing && pestsLineAmount == null) {
    const rule = await getBugsSurchargeRule();
    surchargePercent = rule.percent;
  }

  const pricingModifier = pestsLineAmount == null ? surchargePercent / 100 : 0;

  const { error: updateError } = await supabase
    .from("plants")
    .update({
      bugs_found: true,
      pricing_modifier: pricingModifier,
    })
    .eq("id", plantId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { error: clearError } = await supabase
    .from("pricing_adjustments")
    .delete()
    .eq("plant_id", plantId)
    .eq("adjustment_type", BUGS_ADJUSTMENT_TYPE);

  if (clearError) {
    await supabase
      .from("plants")
      .update({ bugs_found: plant.bugs_found, pricing_modifier: 0 })
      .eq("id", plantId);
    return { success: false, error: clearError.message };
  }

  if (pestsLineAmount != null) {
    const { error: insertError } = await supabase.from("pricing_adjustments").insert({
      plant_id: plantId,
      adjustment_type: BUGS_ADJUSTMENT_TYPE,
      amount: pestsLineAmount,
      percent: null,
      reason: "Pests treatment (Shopify)",
    });

    if (insertError) {
      await supabase
        .from("plants")
        .update({ bugs_found: plant.bugs_found, pricing_modifier: 0 })
        .eq("id", plantId);
      return { success: false, error: insertError.message };
    }
  } else {
    const { error: insertError } = await supabase.from("pricing_adjustments").insert({
      plant_id: plantId,
      adjustment_type: BUGS_ADJUSTMENT_TYPE,
      percent: surchargePercent,
      amount: null,
      reason: "Bugs found during treatment",
    });

    if (insertError) {
      await supabase
        .from("plants")
        .update({ bugs_found: plant.bugs_found, pricing_modifier: 0 })
        .eq("id", plantId);
      return { success: false, error: insertError.message };
    }
  }

  await emitBugsFoundEvent(supabase, plantId);

  return { success: true, bugsFound: true };
}
