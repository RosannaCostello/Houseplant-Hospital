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
    .select("status, visit_id")
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

  const { error: updateError } = await supabase
    .from("plants")
    .update({ status: newStatus })
    .eq("id", plantId);

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
    await supabase.from("plants").update({ status: plant.status }).eq("id", plantId);
    return { success: false, error: historyError.message };
  }

  await emitPlantStatusChangeEvent(supabase, plantId, plant.status, newStatus);

  return { success: true, previousStatus: plant.status, newStatus };
}
