import "server-only";

import { MailchimpApiError } from "@/lib/mailchimp/client";
import {
  isMailchimpEventName,
  type MailchimpEventName,
  type MailchimpEventPayload,
} from "@/lib/mailchimp/event-types";
import { isMailchimpConfigured, isMailchimpOutboxOnly } from "@/lib/mailchimp/env";
import { formatMailchimpOccurredAt, sendMemberEvent } from "@/lib/mailchimp/send-member-event";
import { upsertListMember } from "@/lib/mailchimp/upsert-list-member";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BATCH_SIZE = 50;
const MAX_SEND_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

type MailchimpEventRow = {
  id: string;
  customer_id: string | null;
  plant_id: string | null;
  event_name: string;
  payload: MailchimpEventPayload;
  status: string;
  created_at: string;
};

export type ProcessMailchimpOutboxResult = {
  success: boolean;
  skipped?: string;
  processed: number;
  sent: number;
  failed: number;
  errors: Array<{ eventId: string; eventName: string; error: string }>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function payloadToEventProperties(payload: MailchimpEventPayload): Record<string, string> {
  const properties: Record<string, string> = {};

  if (payload.visitId) properties.visit_id = payload.visitId;
  if (payload.plantId) properties.plant_id = payload.plantId;
  if (payload.customerId) properties.customer_id = payload.customerId;
  if (payload.previousStatus) properties.previous_status = payload.previousStatus;
  if (payload.newStatus) properties.new_status = payload.newStatus;
  if (payload.bugsFound !== undefined) properties.bugs_found = String(payload.bugsFound);

  return properties;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof MailchimpApiError) {
    return RETRYABLE_STATUS_CODES.has(error.status);
  }

  return true;
}

async function resolveEmailForEvent(
  row: MailchimpEventRow,
): Promise<string | null> {
  const fromPayload = row.payload?.email?.trim().toLowerCase();
  if (fromPayload) {
    return fromPayload;
  }

  if (!row.customer_id) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("email")
    .eq("id", row.customer_id)
    .maybeSingle();

  if (error || !data?.email) {
    return null;
  }

  return data.email.trim().toLowerCase();
}

async function ensureAudienceMember(row: MailchimpEventRow, email: string): Promise<void> {
  if (!row.customer_id) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .select("first_name, last_name, phone, marketing_consent")
    .eq("id", row.customer_id)
    .maybeSingle();

  if (error || !customer) {
    return;
  }

  await upsertListMember({
    email,
    firstName: customer.first_name,
    lastName: customer.last_name,
    phone: customer.phone,
    marketingConsent: customer.marketing_consent,
  });
}

function resolveOccurredAt(row: MailchimpEventRow): string | undefined {
  return formatMailchimpOccurredAt(row.payload?.occurredAt ?? row.created_at);
}

async function claimEventRow(eventId: string): Promise<MailchimpEventRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mailchimp_events")
    .update({ status: "processing" })
    .eq("id", eventId)
    .eq("status", "pending")
    .select("id, customer_id, plant_id, event_name, payload, status, created_at")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as MailchimpEventRow;
}

async function markEventSent(eventId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("mailchimp_events")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("status", "processing");

  if (error) {
    throw new Error(`Could not mark event ${eventId} as sent: ${error.message}`);
  }
}

async function markEventFailed(
  row: MailchimpEventRow,
  errorMessage: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const payload: MailchimpEventPayload = {
    ...row.payload,
    _deliveryError: errorMessage,
    _failedAt: new Date().toISOString(),
  };

  await supabase
    .from("mailchimp_events")
    .update({
      status: "failed",
      payload,
    })
    .eq("id", row.id)
    .eq("status", "processing");
}

async function sendEventWithRetry(
  email: string,
  eventName: MailchimpEventName,
  payload: MailchimpEventPayload,
  occurredAt?: string,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
    try {
      await sendMemberEvent({
        email,
        eventName,
        properties: payloadToEventProperties(payload),
        occurredAt,
      });
      return;
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === MAX_SEND_ATTEMPTS) {
        break;
      }

      await sleep(250 * attempt);
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "Mailchimp event delivery failed";
  throw new Error(message);
}

type ProcessEventRowResult =
  | { success: true }
  | { success: false; error: string; skipped?: boolean };

async function processEventRow(row: MailchimpEventRow): Promise<ProcessEventRowResult> {
  const claimed = await claimEventRow(row.id);
  if (!claimed) {
    return { success: false, error: "Already claimed", skipped: true };
  }

  if (!isMailchimpEventName(claimed.event_name)) {
    await markEventFailed(claimed, `Unknown event name: ${claimed.event_name}`);
    return { success: false, error: `Unknown event name: ${claimed.event_name}` };
  }

  const email = await resolveEmailForEvent(claimed);
  if (!email) {
    await markEventFailed(claimed, "Could not resolve contact email for event");
    return { success: false, error: "Could not resolve contact email for event" };
  }

  try {
    await ensureAudienceMember(claimed, email);
    await sendEventWithRetry(
      email,
      claimed.event_name,
      claimed.payload ?? {},
      resolveOccurredAt(claimed),
    );
    await markEventSent(claimed.id);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mailchimp event delivery failed";
    await markEventFailed(claimed, message);
    return { success: false, error: message };
  }
}

/** Process pending `mailchimp_events` rows and deliver to Mailchimp Events API. */
export async function processMailchimpOutbox(): Promise<ProcessMailchimpOutboxResult> {
  if (!isMailchimpConfigured()) {
    return {
      success: true,
      skipped: "Mailchimp is not configured",
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [],
    };
  }

  if (isMailchimpOutboxOnly()) {
    return {
      success: true,
      skipped: "MAILCHIMP_OUTBOX_ONLY is enabled",
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [],
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mailchimp_events")
    .select("id, customer_id, plant_id, event_name, payload, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return {
      success: false,
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [{ eventId: "", eventName: "", error: error.message }],
    };
  }

  const rows = (data ?? []) as MailchimpEventRow[];
  let sent = 0;
  let failed = 0;
  const errors: ProcessMailchimpOutboxResult["errors"] = [];

  for (const row of rows) {
    const result = await processEventRow(row);

    if ("skipped" in result && result.skipped) {
      continue;
    }

    if (result.success) {
      sent += 1;
      continue;
    }

    failed += 1;
    errors.push({
      eventId: row.id,
      eventName: row.event_name,
      error: result.error,
    });
  }

  return {
    success: true,
    processed: rows.length,
    sent,
    failed,
    errors,
  };
}
