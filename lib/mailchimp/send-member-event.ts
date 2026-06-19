import "server-only";

import { mailchimpRequest } from "@/lib/mailchimp/client";
import type { MailchimpEventName } from "@/lib/mailchimp/event-types";
import { getMailchimpConfig } from "@/lib/mailchimp/env";
import { subscriberHashForEmail } from "@/lib/mailchimp/subscriber-hash";

export type SendMemberEventInput = {
  email: string;
  eventName: MailchimpEventName;
  properties?: Record<string, string>;
  occurredAt?: string;
};

/** Mailchimp Events API rejects fractional seconds (e.g. `.000Z`). */
export function formatMailchimpOccurredAt(value?: string): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** POST /lists/{id}/members/{hash}/events — triggers Customer Journeys when configured. */
export async function sendMemberEvent(input: SendMemberEventInput): Promise<void> {
  const { audienceId } = getMailchimpConfig();
  const email = input.email.trim().toLowerCase();
  const subscriberHash = subscriberHashForEmail(email);
  const occurredAt = formatMailchimpOccurredAt(input.occurredAt);

  await mailchimpRequest({
    method: "POST",
    path: `/lists/${audienceId}/members/${subscriberHash}/events`,
    body: {
      name: input.eventName,
      properties: input.properties ?? {},
      ...(occurredAt ? { occurred_at: occurredAt } : {}),
      is_syncing: false,
    },
  });
}
