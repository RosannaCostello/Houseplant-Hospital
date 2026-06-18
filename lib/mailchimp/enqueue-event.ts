import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MailchimpEventName, MailchimpEventPayload } from "@/lib/mailchimp/event-types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type EnqueueMailchimpEventInput = {
  eventName: MailchimpEventName;
  customerId?: string | null;
  plantId?: string | null;
  payload?: MailchimpEventPayload;
};

export type EnqueueMailchimpEventResult =
  | { success: true; eventId: string }
  | { success: false; error: string };

export async function enqueueMailchimpEventWithClient(
  supabase: SupabaseClient,
  input: EnqueueMailchimpEventInput,
): Promise<EnqueueMailchimpEventResult> {
  const occurredAt = input.payload?.occurredAt ?? new Date().toISOString();
  const payload: MailchimpEventPayload = {
    ...input.payload,
    occurredAt,
  };

  if (input.customerId) {
    payload.customerId = input.customerId;
  }

  if (input.plantId) {
    payload.plantId = input.plantId;
  }

  const { data, error } = await supabase
    .from("mailchimp_events")
    .insert({
      customer_id: input.customerId ?? null,
      plant_id: input.plantId ?? null,
      event_name: input.eventName,
      payload,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Could not queue Mailchimp event" };
  }

  return { success: true, eventId: data.id };
}

export async function enqueueMailchimpEvent(
  input: EnqueueMailchimpEventInput,
): Promise<EnqueueMailchimpEventResult> {
  const supabase = createSupabaseAdminClient();
  return enqueueMailchimpEventWithClient(supabase, input);
}
