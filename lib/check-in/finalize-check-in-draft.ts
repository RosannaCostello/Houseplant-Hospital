import type { SupabaseClient } from "@supabase/supabase-js";
import { getCheckInDraftWithClient, deleteCheckInDraftWithClient } from "@/lib/check-in/check-in-draft";
import { createCheckInRecordsWithClient, rollbackCheckInWithClient } from "@/lib/check-in/create-check-in-records";
import {
  getDraftPaymentSnapshotWithClient,
  visitPaymentStatusFromDraft,
} from "@/lib/check-in/pos-checkout";
import { checkInPlantsStepSchema } from "@/lib/check-in/plant-schema";
import { emitPlantStatusChangeEvent } from "@/lib/mailchimp/emit-plant-event";
import { syncCheckInToMailchimp } from "@/lib/mailchimp/sync-check-in";
import { copyDraftPhotoToPlant } from "@/lib/photos/upload-draft-photo";
import { requestPlantLabelPrint } from "@/lib/printing/request-plant-label-print";
import type { PosCheckoutPayload } from "@/lib/shopify/pos-checkout-types";

export type FinalizeCheckInDraftResult =
  | { success: true; visitId: string }
  | { success: false; error: string };

function rewritePosPayloadForVisit(
  payload: PosCheckoutPayload | null,
  visitId: string,
): PosCheckoutPayload | null {
  if (!payload?.lineItems?.length) return payload;

  return {
    ...payload,
    draftId: undefined,
    visitId,
    cartNote: `Houseplant Hospital collection visit: ${payload.customerName} (${visitId})`,
    lineItems: payload.lineItems.map((lineItem) => ({
      variantId: lineItem.variantId,
      quantity: lineItem.quantity,
      properties: [{ name: "_hh_visit_id", value: visitId }],
    })),
  };
}

export async function finalizeCheckInDraftWithClient(
  supabase: SupabaseClient,
  draftId: string,
): Promise<FinalizeCheckInDraftResult> {
  const draft = await getCheckInDraftWithClient(supabase, draftId);

  if (!draft) {
    return { success: false, error: "Draft check-in not found." };
  }

  const plantsParsed = checkInPlantsStepSchema.safeParse({ plants: draft.plants });

  if (!plantsParsed.success) {
    return { success: false, error: "Plant details are incomplete. Return to the plants step." };
  }

  const plants = plantsParsed.data.plants;
  const paymentSnapshot = await getDraftPaymentSnapshotWithClient(supabase, draftId);
  const visitPaymentStatus = paymentSnapshot
    ? visitPaymentStatusFromDraft(paymentSnapshot.paymentStatus)
    : "not_started";

  const missingPhotos = plants.filter(
    (plant) => !draft.photos.some((photo) => photo.plantClientId === plant.clientId),
  );

  if (missingPhotos.length > 0) {
    return {
      success: false,
      error: `Add a photo for each plant (${missingPhotos.length} remaining).`,
    };
  }

  let visitId: string | null = null;
  const copiedPaths: string[] = [];

  try {
    const records = await createCheckInRecordsWithClient(
      supabase,
      {
        customer: draft.customer,
        plants,
      },
      { deferMailchimp: true },
    );

    if (!records.success) {
      return { success: false, error: records.error };
    }

    visitId = records.visitId;

    const { error: visitPaymentError } = await supabase
      .from("visits")
      .update({
        payment_status: visitPaymentStatus,
        shopify_order_id: paymentSnapshot?.shopifyOrderId ?? null,
        shopify_paid_at: paymentSnapshot?.paidAt ?? null,
        pos_line_items: rewritePosPayloadForVisit(
          paymentSnapshot?.posLineItems ?? null,
          records.visitId,
        ),
      })
      .eq("id", records.visitId);

    if (visitPaymentError) {
      throw new Error(visitPaymentError.message);
    }

    const plantIdByClientId = new Map(records.plants.map((row) => [row.clientId, row.plantId]));

    const { data: photoRows, error: photoError } = await supabase
      .from("check_in_draft_photos")
      .select("plant_client_id, storage_path, thumbnail_path, mime_type")
      .eq("draft_id", draftId);

    if (photoError) {
      throw new Error(photoError.message);
    }

    for (const plant of plants) {
      const plantId = plantIdByClientId.get(plant.clientId);
      const photoRow = (photoRows ?? []).find((row) => row.plant_client_id === plant.clientId);

      if (!plantId || !photoRow) {
        throw new Error("Could not match plant to draft photo.");
      }

      const mimeType = photoRow.mime_type as "image/webp" | "image/jpeg";
      const copied = await copyDraftPhotoToPlant(
        supabase,
        photoRow.storage_path,
        photoRow.thumbnail_path,
        plantId,
        mimeType,
      );
      copiedPaths.push(copied.storagePath, copied.thumbnailPath);

      const { error: insertError } = await supabase.from("plant_photos").insert({
        plant_id: plantId,
        storage_path: copied.storagePath,
        thumbnail_path: copied.thumbnailPath,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    const deleted = await deleteCheckInDraftWithClient(supabase, draftId);
    if (!deleted.success) {
      throw new Error(deleted.error);
    }

    await syncCheckInToMailchimp({
      supabase,
      customer: draft.customer,
      customerId: records.customerId,
      visitId: records.visitId,
      plants: records.plants.map((plant) => ({ plantId: plant.plantId })),
    });

    for (const plant of records.plants) {
      if (plant.status === "quarantine") {
        await emitPlantStatusChangeEvent(supabase, plant.plantId, "check_in", "quarantine");
      }
    }

    // Auto-print one label per plant (HIL-116). Never fail check-in if the Mini is down —
    // jobs stay pending and cron / Reprint drains them.
    for (const plant of records.plants) {
      try {
        const printResult = await requestPlantLabelPrint(supabase, plant.plantId);
        if (!printResult.success) {
          console.error(
            `[print] check-in label failed for plant ${plant.plantId}: ${printResult.error}`,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "print failed";
        console.error(`[print] check-in label threw for plant ${plant.plantId}: ${message}`);
      }
    }

    return { success: true, visitId: records.visitId };
  } catch (error) {
    if (copiedPaths.length > 0) {
      await supabase.storage.from("plant-photos").remove(copiedPaths);
    }

    if (visitId) {
      try {
        await rollbackCheckInWithClient(supabase, visitId);
      } catch {
        // Draft is kept so staff can retry finalize.
      }
    }

    const message = error instanceof Error ? error.message : "Check-in failed";
    return { success: false, error: message };
  }
}
