import "server-only";

import { mailchimpRequest } from "@/lib/mailchimp/client";
import { getMailchimpConfig } from "@/lib/mailchimp/env";
import { buildHildaMergeFields, HILDA_MERGE_FIELDS } from "@/lib/mailchimp/merge-fields";
import {
  isMailchimpSubscribeComplianceError,
  shouldAttemptSubscribeRepair,
} from "@/lib/mailchimp/subscribe-status-repair";
import { subscriberHashForEmail } from "@/lib/mailchimp/subscriber-hash";
import type { MailchimpListMember, MailchimpMemberStatus } from "@/lib/mailchimp/types";

export type UpsertListMemberInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  marketingConsent: boolean;
  audienceId?: string;
};

type MailchimpMemberResponse = {
  id: string;
  contact_id: string;
  email_address: string;
  status: MailchimpMemberStatus;
};

function statusForNewMember(marketingConsent: boolean): MailchimpMemberStatus {
  return marketingConsent ? "subscribed" : "transactional";
}

function mapMemberResponse(row: MailchimpMemberResponse): MailchimpListMember {
  return {
    id: row.id,
    contactId: row.contact_id,
    emailAddress: row.email_address,
    status: row.status,
  };
}

/** NAME is required on the Hilda audience — never send blank. */
function withRequiredName(mergeFields: Record<string, string>): Record<string, string> {
  const name = mergeFields[HILDA_MERGE_FIELDS.name]?.trim();
  return {
    ...mergeFields,
    [HILDA_MERGE_FIELDS.name]: name || "friend",
  };
}

/**
 * Create or update an audience member.
 *
 * - New contacts: `status_if_new` = subscribed (consent) or transactional (no consent).
 * - Existing contacts: omit `status` on the first PUT so we do not accidentally
 *   overwrite consent. If marketing consent is on and Mailchimp still has them as
 *   unsubscribed or transactional, attempt a second PUT to subscribed.
 * - Cleaned / compliance-blocked contacts are left unchanged (check-in must not fail).
 */
export async function upsertListMember(input: UpsertListMemberInput): Promise<MailchimpListMember> {
  const audienceId = input.audienceId ?? getMailchimpConfig().audienceId;
  const email = input.email.trim().toLowerCase();
  const subscriberHash = subscriberHashForEmail(email);

  const mergeFields = withRequiredName(
    buildHildaMergeFields({
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
    }),
  );

  const memberPath = `/lists/${audienceId}/members/${subscriberHash}`;

  const row = await mailchimpRequest<MailchimpMemberResponse>({
    method: "PUT",
    path: memberPath,
    body: {
      email_address: email,
      status_if_new: statusForNewMember(input.marketingConsent),
      merge_fields: mergeFields,
    },
  });

  if (!shouldAttemptSubscribeRepair(input.marketingConsent, row.status)) {
    return mapMemberResponse(row);
  }

  try {
    const repaired = await mailchimpRequest<MailchimpMemberResponse>({
      method: "PUT",
      path: memberPath,
      body: {
        email_address: email,
        status: "subscribed",
        merge_fields: mergeFields,
      },
    });
    return mapMemberResponse(repaired);
  } catch (error) {
    // Compliance / bounce blocks must not fail check-in or outbox delivery.
    if (isMailchimpSubscribeComplianceError(error)) {
      return mapMemberResponse(row);
    }
    throw error;
  }
}
