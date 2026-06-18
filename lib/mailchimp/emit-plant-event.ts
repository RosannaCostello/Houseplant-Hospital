import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getMailchimpAdapter } from "@/lib/mailchimp/adapter";
import { MAILCHIMP_TAGS } from "@/lib/mailchimp/config";
import {
  MAILCHIMP_EVENT_NAMES,
  mailchimpEventNameForPlantStatus,
  type MailchimpEventName,
} from "@/lib/mailchimp/event-types";
import { isMailchimpConfigured, isMailchimpOutboxOnly } from "@/lib/mailchimp/env";
import { addMemberTags } from "@/lib/mailchimp/update-member-tags";
import type { PlantStatus } from "@/lib/plant-status";

type PlantCustomerContext = {
  plantId: string;
  customerId: string;
  visitId: string;
  email: string;
};

/** Load plant → visit → customer in separate queries (reliable on Cloudflare + RLS). */
async function resolvePlantCustomerContext(
  supabase: SupabaseClient,
  plantId: string,
): Promise<PlantCustomerContext | null> {
  const { data: plant, error: plantError } = await supabase
    .from("plants")
    .select("id, visit_id")
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

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("email")
    .eq("id", visit.customer_id)
    .maybeSingle();

  const email = customer?.email?.trim().toLowerCase();
  if (customerError || !email) {
    console.error("[mailchimp] customer lookup failed:", customerError?.message ?? "no email");
    return null;
  }

  return {
    plantId: plant.id,
    customerId: visit.customer_id,
    visitId: plant.visit_id,
    email,
  };
}

async function queuePlantEvent(
  context: PlantCustomerContext,
  eventName: MailchimpEventName,
  payload: {
    previousStatus?: PlantStatus;
    newStatus?: PlantStatus;
    bugsFound?: boolean;
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

  const eventName = mailchimpEventNameForPlantStatus(newStatus);
  if (!eventName || eventName === MAILCHIMP_EVENT_NAMES.plantCheckedIn) {
    return;
  }

  try {
    const context = await resolvePlantCustomerContext(supabase, plantId);
    if (!context) {
      return;
    }

    await queuePlantEvent(context, eventName, { previousStatus, newStatus });
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
