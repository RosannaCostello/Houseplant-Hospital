import "server-only";

import {
  enqueueMailchimpEvent,
  type EnqueueMailchimpEventInput,
} from "@/lib/mailchimp/enqueue-event";
import { isMailchimpOutboxOnly } from "@/lib/mailchimp/env";

export type MailchimpDeliveryMode = "outbox";

export type QueueMailchimpEventResult =
  | { success: true; eventId: string; mode: MailchimpDeliveryMode }
  | { success: false; error: string };

export type MailchimpSyncAdapter = {
  /**
   * Queue an event for later delivery. Never calls the Mailchimp API directly —
   * the outbox worker (HIL-57) processes pending rows when live delivery is enabled.
   */
  queueEvent: (input: EnqueueMailchimpEventInput) => Promise<QueueMailchimpEventResult>;
};

const outboxAdapter: MailchimpSyncAdapter = {
  async queueEvent(input) {
    const result = await enqueueMailchimpEvent(input);

    if (!result.success) {
      return result;
    }

    return { ...result, mode: "outbox" };
  },
};

/** App code should use this — queues to `mailchimp_events` without live API calls. */
export function getMailchimpAdapter(): MailchimpSyncAdapter {
  return outboxAdapter;
}

/** True when the outbox worker must not call Mailchimp (local dev or explicit flag). */
export function shouldSkipLiveMailchimpDelivery(): boolean {
  return isMailchimpOutboxOnly();
}
