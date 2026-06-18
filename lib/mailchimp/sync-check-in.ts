import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateCheckInInput } from "@/lib/check-in/create-check-in-input";
import { getMailchimpAdapter } from "@/lib/mailchimp/adapter";
import { MAILCHIMP_TAGS } from "@/lib/mailchimp/config";
import { MAILCHIMP_EVENT_NAMES } from "@/lib/mailchimp/event-types";
import { isMailchimpConfigured, isMailchimpOutboxOnly } from "@/lib/mailchimp/env";
import { addMemberTags } from "@/lib/mailchimp/update-member-tags";
import { upsertListMember } from "@/lib/mailchimp/upsert-list-member";

export type SyncCheckInMailchimpInput = {
  supabase: SupabaseClient;
  customer: CreateCheckInInput["customer"];
  customerId: string;
  visitId: string;
  plants: Array<{ plantId: string }>;
};

export type SyncCheckInMailchimpResult = {
  queuedEventIds: string[];
  mailchimpContactId: string | null;
  warnings: string[];
};

async function isRepeatHospitalCustomer(
  supabase: SupabaseClient,
  customerId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);

  if (error) {
    return false;
  }

  return (count ?? 0) > 1;
}

function tagsForCheckIn(marketingConsent: boolean, isRepeat: boolean): string[] {
  const tags: string[] = [MAILCHIMP_TAGS.houseplantHospital];

  if (isRepeat) {
    tags.push(MAILCHIMP_TAGS.repeatHospitalCustomer);
  }

  if (marketingConsent) {
    tags.push(MAILCHIMP_TAGS.newsletter);
  }

  return tags;
}

/**
 * Best-effort Mailchimp sync after check-in. Never throws — failures are returned as warnings.
 * Check-in success must not depend on Mailchimp.
 */
export async function syncCheckInToMailchimp(
  input: SyncCheckInMailchimpInput,
): Promise<SyncCheckInMailchimpResult> {
  const warnings: string[] = [];
  const queuedEventIds: string[] = [];
  let mailchimpContactId: string | null = null;

  const adapter = getMailchimpAdapter();
  const email = input.customer.email.trim().toLowerCase();

  for (const plant of input.plants) {
    const queued = await adapter.queueEvent({
      eventName: MAILCHIMP_EVENT_NAMES.plantCheckedIn,
      customerId: input.customerId,
      plantId: plant.plantId,
      payload: {
        email,
        visitId: input.visitId,
        customerId: input.customerId,
        plantId: plant.plantId,
      },
    });

    if (!queued.success) {
      warnings.push(`Could not queue plant_checked_in for plant ${plant.plantId}: ${queued.error}`);
      continue;
    }

    queuedEventIds.push(queued.eventId);
  }

  if (!isMailchimpConfigured() || isMailchimpOutboxOnly()) {
    return { queuedEventIds, mailchimpContactId, warnings };
  }

  try {
    const isRepeat = await isRepeatHospitalCustomer(input.supabase, input.customerId);

    const member = await upsertListMember({
      email,
      firstName: input.customer.firstName,
      lastName: input.customer.lastName,
      phone: input.customer.phone || null,
      marketingConsent: input.customer.marketingConsent,
    });

    mailchimpContactId = member.contactId;

    await addMemberTags(email, tagsForCheckIn(input.customer.marketingConsent, isRepeat));

    const { error: updateError } = await input.supabase
      .from("customers")
      .update({ mailchimp_contact_id: member.contactId })
      .eq("id", input.customerId);

    if (updateError) {
      warnings.push(`Mailchimp synced but could not save contact id: ${updateError.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mailchimp sync failed";
    warnings.push(message);
  }

  return { queuedEventIds, mailchimpContactId, warnings };
}
