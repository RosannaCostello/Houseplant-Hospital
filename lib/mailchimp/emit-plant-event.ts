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
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PlantStatus } from "@/lib/plant-status";

type PlantCustomerContext = {
  plantId: string;
  customerId: string;
  visitId: string;
  email: string;
};

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function resolvePlantCustomerContext(plantId: string): Promise<PlantCustomerContext | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("plants")
    .select(
      `
      id,
      visit_id,
      visits!inner (
        customer_id,
        customers!inner (
          email
        )
      )
    `,
    )
    .eq("id", plantId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const visit = unwrapRelation(
    data.visits as
      | { customer_id: string; customers: { email: string } | { email: string }[] }
      | Array<{ customer_id: string; customers: { email: string } | { email: string }[] }>
      | null,
  );
  const customer = visit ? unwrapRelation(visit.customers) : null;
  const email = customer?.email?.trim().toLowerCase();

  if (!visit?.customer_id || !email) {
    return null;
  }

  return {
    plantId: data.id,
    customerId: visit.customer_id,
    visitId: data.visit_id,
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
  await adapter.queueEvent({
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
}

/**
 * Best-effort Mailchimp event after a plant status change. Never throws.
 * Skips `plant_checked_in` — that is emitted at check-in only (HIL-55).
 */
export async function emitPlantStatusChangeEvent(
  _supabase: SupabaseClient,
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
    const context = await resolvePlantCustomerContext(plantId);
    if (!context) {
      return;
    }

    await queuePlantEvent(context, eventName, { previousStatus, newStatus });
  } catch {
    // Mailchimp must not block workflow updates.
  }
}

/** Best-effort `bugs_found` event + `bugs_treatment` tag when bugs are flagged. Never throws. */
export async function emitBugsFoundEvent(_supabase: SupabaseClient, plantId: string): Promise<void> {
  try {
    const context = await resolvePlantCustomerContext(plantId);
    if (!context) {
      return;
    }

    await queuePlantEvent(context, MAILCHIMP_EVENT_NAMES.bugsFound, { bugsFound: true });

    if (isMailchimpConfigured() && !isMailchimpOutboxOnly()) {
      await addMemberTags(context.email, [MAILCHIMP_TAGS.bugsTreatment]);
    }
  } catch {
    // Mailchimp must not block workflow updates.
  }
}
