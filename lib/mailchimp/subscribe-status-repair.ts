import type { MailchimpMemberStatus } from "@/lib/mailchimp/types";

/** Statuses we may promote to subscribed when marketing consent is on. */
const REPAIRABLE_STATUSES = new Set<MailchimpMemberStatus>([
  "unsubscribed",
  "transactional",
]);

/**
 * When marketing consent is checked, existing unsubscribed / transactional
 * contacts should be promoted to subscribed so Journey emails can send.
 * Never attempt for cleaned (or any other status).
 */
export function shouldAttemptSubscribeRepair(
  marketingConsent: boolean,
  status: MailchimpMemberStatus | string,
): boolean {
  if (!marketingConsent) {
    return false;
  }

  return REPAIRABLE_STATUSES.has(status as MailchimpMemberStatus);
}

/** Mailchimp refuses subscribe for bounce / unsubscribe / compliance review. */
export function isMailchimpSubscribeComplianceError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return /compliance state/i.test(message);
}
