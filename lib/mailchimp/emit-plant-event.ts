import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { OUTPATIENT_NOTIFY_BLOCKING_STATUSES, isFinalOutpatientPlantForVisit } from "@/lib/dashboard/outpatient-collection-badge";
import { getMailchimpAdapter } from "@/lib/mailchimp/adapter";
import { MAILCHIMP_TAGS } from "@/lib/mailchimp/config";
import {
  MAILCHIMP_EVENT_NAMES,
  mailchimpEventNameForPlantStatus,
  type MailchimpEventName,
} from "@/lib/mailchimp/event-types";
import { isMailchimpConfigured, isMailchimpOutboxOnly } from "@/lib/mailchimp/env";
import { shouldEmitPlantInSurgeryEvent } from "@/lib/mailchimp/surgery-event-gate";
import { addMemberTags } from "@/lib/mailchimp/update-member-tags";
import { PLANT_STATUSES, type PlantStatus } from "@/lib/plant-status";

function isPlantStatus(value: string): value is PlantStatus {
  return (PLANT_STATUSES as readonly string[]).includes(value);
}

type PlantCustomerContext = {
  plantId: string;
  customerId: string;
  visitId: string;
  email: string;
  plantName?: string;
  treatmentNotes?: string;
  careTips?: string;
};

/** Load plant → visit → customer (+ notes) in separate queries (reliable on Cloudflare + RLS). */
async function resolvePlantCustomerContext(
  supabase: SupabaseClient,
  plantId: string,
): Promise<PlantCustomerContext | null> {
  const { data: plant, error: plantError } = await supabase
    .from("plants")
    .select("id, visit_id, name")
    .eq("id", plantId)
    .maybeSingle();

  if (plantError || !plant) {
    console.error("[mailchimp] plant lookup failed:", plantError?.message ?? "not found");
    return null;
  }

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select("customer_id")
    .eq("id", plant.visit_id)
    .maybeSingle();

  if (visitError || !visit) {
    console.error("[mailchimp] visit lookup failed:", visitError?.message ?? "not found");
    return null;
  }

  const [customerResult, treatmentResult, careTipsResult] = await Promise.all([
    supabase.from("customers").select("email").eq("id", visit.customer_id).maybeSingle(),
    supabase.from("treatment_notes").select("content").eq("plant_id", plantId).maybeSingle(),
    supabase.from("care_tips").select("content").eq("plant_id", plantId).maybeSingle(),
  ]);

  const email = customerResult.data?.email?.trim().toLowerCase();
  if (customerResult.error || !email) {
    console.error(
      "[mailchimp] customer lookup failed:",
      customerResult.error?.message ?? "no email",
    );
    return null;
  }

  if (treatmentResult.error) {
    console.error("[mailchimp] treatment notes lookup failed:", treatmentResult.error.message);
  }
  if (careTipsResult.error) {
    console.error("[mailchimp] care tips lookup failed:", careTipsResult.error.message);
  }

  const plantName = plant.name?.trim() || undefined;
  const treatmentNotes = treatmentResult.data?.content?.trim() || undefined;
  const careTips = careTipsResult.data?.content?.trim() || undefined;

  return {
    plantId: plant.id,
    customerId: visit.customer_id,
    visitId: plant.visit_id,
    email,
    plantName,
    treatmentNotes,
    careTips,
  };
}

async function queuePlantEvent(
  context: PlantCustomerContext,
  eventName: MailchimpEventName,
  payload: {
    previousStatus?: PlantStatus;
    newStatus?: PlantStatus;
    bugsFound?: boolean;
    awaitingPlantCount?: number;
    childPlantId?: string;
    size?: string;
  },
): Promise<void> {
  const adapter = getMailchimpAdapter();
  const result = await adapter.queueEvent({
    eventName,
    customerId: context.customerId,
    plantId: context.plantId,
    payload: {
      email: context.email,
      customerId: context.customerId,
      visitId: context.visitId,
      plantId: context.plantId,
      plantName: context.plantName,
      treatmentNotes: context.treatmentNotes,
      careTips: context.careTips,
      ...payload,
    },
  });

  if (!result.success) {
    console.error("[mailchimp] queue failed:", eventName, result.error);
  }
}

/**
 * Best-effort Mailchimp event after a plant status change. Never throws.
 * Skips `plant_checked_in` — that is emitted at check-in only (HIL-55).
 * In Surgery: `plant_in_surgery` only for the first plant on the visit.
 * Outpatient: `plant_outpatient` when the visit is fully ready;
 * `plant_outpatient_partial` when siblings still block collection notice.
 */
export async function emitPlantStatusChangeEvent(
  supabase: SupabaseClient,
  plantId: string,
  previousStatus: PlantStatus,
  newStatus: PlantStatus,
): Promise<void> {
  if (previousStatus === newStatus) {
    return;
  }

  let eventName = mailchimpEventNameForPlantStatus(newStatus);
  if (!eventName || eventName === MAILCHIMP_EVENT_NAMES.plantCheckedIn) {
    return;
  }

  try {
    const context = await resolvePlantCustomerContext(supabase, plantId);
    if (!context) {
      return;
    }

    let awaitingPlantCount: number | undefined;

    if (newStatus === "in_surgery" || newStatus === "outpatient") {
      const { data: siblings, error: siblingsError } = await supabase
        .from("plants")
        .select("id, status")
        .eq("visit_id", context.visitId);

      if (siblingsError) {
        console.error("[mailchimp] sibling plant lookup failed:", siblingsError.message);
        return;
      }

      const visitPlants = (siblings ?? [])
        .filter((row): row is { id: string; status: PlantStatus } =>
          Boolean(row.id && row.status && isPlantStatus(row.status)),
        )
        .map((row) => ({ id: row.id, status: row.status }));

      if (newStatus === "in_surgery") {
        if (!shouldEmitPlantInSurgeryEvent(plantId, visitPlants)) {
          return;
        }
      } else if (isFinalOutpatientPlantForVisit(plantId, visitPlants)) {
        eventName = MAILCHIMP_EVENT_NAMES.plantOutpatient;
      } else {
        eventName = MAILCHIMP_EVENT_NAMES.plantOutpatientPartial;
        awaitingPlantCount = visitPlants.filter(
          (plant) =>
            plant.id !== plantId && OUTPATIENT_NOTIFY_BLOCKING_STATUSES.has(plant.status),
        ).length;
      }
    }

    await queuePlantEvent(context, eventName, {
      previousStatus,
      newStatus,
      awaitingPlantCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("[mailchimp] status event failed:", eventName, message);
  }
}

/** Best-effort `bugs_found` event + `bugs_treatment` tag when bugs are flagged. Never throws. */
export async function emitBugsFoundEvent(supabase: SupabaseClient, plantId: string): Promise<void> {
  try {
    const context = await resolvePlantCustomerContext(supabase, plantId);
    if (!context) {
      return;
    }

    await queuePlantEvent(context, MAILCHIMP_EVENT_NAMES.bugsFound, { bugsFound: true });

    if (isMailchimpConfigured() && !isMailchimpOutboxOnly()) {
      await addMemberTags(context.email, [MAILCHIMP_TAGS.bugsTreatment]);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("[mailchimp] bugs_found event failed:", message);
  }
}

/**
 * Best-effort `plant_propagated` after staff propagates a source plant.
 * Queued against the source plant (parent); includes child plant id + size.
 * Never throws.
 */
export async function emitPlantPropagatedEvent(
  supabase: SupabaseClient,
  sourcePlantId: string,
  childPlantId: string,
  size: string,
): Promise<void> {
  try {
    const context = await resolvePlantCustomerContext(supabase, sourcePlantId);
    if (!context) {
      return;
    }

    await queuePlantEvent(context, MAILCHIMP_EVENT_NAMES.plantPropagated, {
      childPlantId,
      size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("[mailchimp] plant_propagated event failed:", message);
  }
}
