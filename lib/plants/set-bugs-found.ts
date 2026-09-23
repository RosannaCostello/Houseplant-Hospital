import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureVisitPosCartWithClient,
  queuePestsSurchargeForPaidVisitWithClient,
} from "@/lib/check-in/pos-checkout";
import { emitBugsFoundEvent } from "@/lib/mailchimp/emit-plant-event";
import { coercePlantSize } from "@/lib/plant-size";
import { getBugsSurchargeRule } from "@/lib/pricing/get-bugs-surcharge-rule";
import { getBasePriceForSize, getBasePriceRules } from "@/lib/pricing/get-base-price-rules";
import { roundMoney } from "@/lib/pricing/round-money";
import { updatePlantStatusWithClient } from "@/lib/plants/update-plant-status";
import { isShopifyPricingConfigured } from "@/lib/shopify/env";
import {
  isPosPaymentStatus,
  isVisitFullyPaid,
  isVisitUnpaid,
} from "@/lib/shopify/pos-checkout-types";
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
    return { success: false, error: "You must be signed in to update pests found." };
  }

  const { data: plant, error: fetchError } = await supabase
    .from("plants")
    .select("bugs_found, size, status, visit_id")
    .eq("id", plantId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!plant) {
    return { success: false, error: "Plant not found." };
  }

  if (plant.status === "collected") {
    return { success: false, error: "Collected plants cannot be edited." };
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

  if (plant.size) {
    const size = coercePlantSize(plant.size);
    if (size) {
      const [baseRules, pestsRules] = await Promise.all([getBasePriceRules(), getPestsPriceRules()]);
      const pestsAmount = pestsRules[size];

      if (pestsAmount != null) {
        const baseAmount = getBasePriceForSize(baseRules, size);
        pestsLineAmount = roundMoney(pestsAmount - baseAmount);
      }
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
      bugs_found_ever: true,
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
      reason: "Pests found during treatment",
    });

    if (insertError) {
      await supabase
        .from("plants")
        .update({ bugs_found: plant.bugs_found, pricing_modifier: 0 })
        .eq("id", plantId);
      return { success: false, error: insertError.message };
    }
  }

  // HIL-128 cascade: Quarantine from Check-in only (Not sure plants are usually already there).
  if (plant.status === "check_in") {
    const move = await updatePlantStatusWithClient(supabase, plantId, "quarantine");
    if (!move.success) {
      console.error("[set-bugs-found] auto-quarantine failed:", move.error);
    }
  }

  await emitBugsFoundEvent(supabase, plantId);

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select("payment_status")
    .eq("id", plant.visit_id)
    .maybeSingle();

  if (visitError) {
    console.error("[set-bugs-found] visit payment lookup failed:", visitError.message);
    return { success: true, bugsFound: true };
  }

  const paymentStatus = isPosPaymentStatus(visit?.payment_status ?? "")
    ? visit!.payment_status
    : null;

  if (isVisitFullyPaid(paymentStatus) || paymentStatus === "part_paid") {
    if (!plant.size) {
      return { success: true, bugsFound: true };
    }

    const queued = await queuePestsSurchargeForPaidVisitWithClient(supabase, {
      visitId: plant.visit_id,
      plantId,
      size: plant.size,
    });

    if (!queued.success) {
      console.error("[set-bugs-found] pests surcharge queue failed:", queued.error);
    }
  } else if (isVisitUnpaid(paymentStatus)) {
    const rebuilt = await ensureVisitPosCartWithClient(supabase, plant.visit_id);
    if (!rebuilt.success) {
      console.error("[set-bugs-found] unpaid cart rebuild failed:", rebuilt.error);
    }
  }

  return { success: true, bugsFound: true };
}
