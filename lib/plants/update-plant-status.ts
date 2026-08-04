import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureVisitPosCartWithClient,
  settleVisitPaymentOutsideShopifyWithClient,
} from "@/lib/check-in/pos-checkout";
import { emitPlantStatusChangeEvent } from "@/lib/mailchimp/emit-plant-event";
import {
  canTransitionPlantStatus,
  PLANT_STATUSES,
  plantStatusLabel,
  type PlantStatus,
} from "@/lib/plant-status";
import {
  checkOutpatientReadinessWithClient,
  formatOutpatientReadinessMessage,
} from "@/lib/plants/outpatient-readiness";
import { getPlantPricingWithClient } from "@/lib/pricing/get-plant-pricing";
import { roundMoney } from "@/lib/pricing/round-money";
import { isPosPaymentStatus, isVisitUnpaid } from "@/lib/shopify/pos-checkout-types";

export type UpdatePlantStatusOptions = {
  /** Staff confirmed the customer paid outside Shopify POS. */
  paidAnotherWay?: boolean;
};

export type UpdatePlantStatusResult =
  | { success: true; previousStatus: PlantStatus; newStatus: PlantStatus }
  | { success: false; error: string; code?: "OUTPATIENT_INCOMPLETE" | "UNPAID_COLLECTION" };

function isPlantStatus(value: string): value is PlantStatus {
  return (PLANT_STATUSES as readonly string[]).includes(value);
}

export async function updatePlantStatusWithClient(
  supabase: SupabaseClient,
  plantId: string,
  newStatus: PlantStatus,
  options: UpdatePlantStatusOptions = {},
): Promise<UpdatePlantStatusResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to update plant status." };
  }

  const { data: plant, error: fetchError } = await supabase
    .from("plants")
    .select("status, visit_id, final_price")
    .eq("id", plantId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!plant?.status || !isPlantStatus(plant.status)) {
    return { success: false, error: "Plant not found." };
  }

  if (plant.status === newStatus) {
    return { success: true, previousStatus: plant.status, newStatus };
  }

  if (!canTransitionPlantStatus(plant.status, newStatus)) {
    return {
      success: false,
      error: `A plant cannot move from ${plantStatusLabel(plant.status)} to ${plantStatusLabel(newStatus)}.`,
    };
  }

  if (newStatus === "outpatient") {
    const readiness = await checkOutpatientReadinessWithClient(supabase, plantId);
    if (!readiness.ready) {
      return {
        success: false,
        code: "OUTPATIENT_INCOMPLETE",
        error: formatOutpatientReadinessMessage(readiness.missing),
      };
    }

    const cartResult = await ensureVisitPosCartWithClient(supabase, plant.visit_id);
    if (!cartResult.success) {
      return { success: false, error: cartResult.error };
    }
  }

  if (newStatus === "collected") {
    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .select("payment_status")
      .eq("id", plant.visit_id)
      .maybeSingle();

    if (visitError) {
      return { success: false, error: visitError.message };
    }

    const paymentStatus = isPosPaymentStatus(visit?.payment_status ?? "")
      ? visit!.payment_status
      : null;

    if (isVisitUnpaid(paymentStatus)) {
      if (!options.paidAnotherWay) {
        return {
          success: false,
          code: "UNPAID_COLLECTION",
          error:
            "This plant is currently unpaid. Complete payment in Shopify POS, or confirm the customer paid another way.",
        };
      }

      const settled = await settleVisitPaymentOutsideShopifyWithClient(supabase, plant.visit_id);
      if (!settled.success) {
        return { success: false, error: settled.error };
      }
    }
  }

  let collectedAt: string | null = null;
  let finalPrice: number | null = null;

  if (newStatus === "collected") {
    collectedAt = new Date().toISOString();

    const existingPrice =
      plant.final_price != null && Number.isFinite(Number(plant.final_price))
        ? roundMoney(Number(plant.final_price))
        : null;

    if (existingPrice != null && existingPrice > 0) {
      finalPrice = existingPrice;
    } else {
      const pricing = await getPlantPricingWithClient(supabase, plantId);
      if (pricing && pricing.totalAmount > 0) {
        finalPrice = roundMoney(pricing.totalAmount);
      }
    }
  }

  const { data: rpcRows, error: rpcError } = await supabase.rpc("update_plant_status_atomic", {
    p_plant_id: plantId,
    p_new_status: newStatus,
    p_collected_at: collectedAt,
    p_final_price: finalPrice,
  });

  if (rpcError) {
    // Fallback while migration 0022 is pending — still try to keep plant+history consistent.
    const plantUpdate: {
      status: PlantStatus;
      collected_at?: string;
      final_price?: number;
    } = { status: newStatus };

    if (collectedAt) plantUpdate.collected_at = collectedAt;
    if (finalPrice != null) plantUpdate.final_price = finalPrice;

    const { error: updateError } = await supabase.from("plants").update(plantUpdate).eq("id", plantId);
    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const { error: historyError } = await supabase.from("status_history").insert({
      plant_id: plantId,
      previous_status: plant.status,
      new_status: newStatus,
      changed_by: user.id,
    });

    if (historyError) {
      await supabase
        .from("plants")
        .update({
          status: plant.status,
          collected_at: null,
          final_price: plant.final_price,
        })
        .eq("id", plantId);
      return { success: false, error: historyError.message };
    }

    await emitPlantStatusChangeEvent(supabase, plantId, plant.status, newStatus);
    return { success: true, previousStatus: plant.status, newStatus };
  }

  const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
  const previousStatus =
    row && typeof row === "object" && "previous_status" in row && isPlantStatus(String(row.previous_status))
      ? (row.previous_status as PlantStatus)
      : plant.status;
  const appliedStatus =
    row && typeof row === "object" && "new_status" in row && isPlantStatus(String(row.new_status))
      ? (row.new_status as PlantStatus)
      : newStatus;

  await emitPlantStatusChangeEvent(supabase, plantId, previousStatus, appliedStatus);

  return { success: true, previousStatus, newStatus: appliedStatus };
}
