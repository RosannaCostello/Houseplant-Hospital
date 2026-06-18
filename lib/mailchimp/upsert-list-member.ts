import "server-only";

import { mailchimpRequest } from "@/lib/mailchimp/client";
import { getMailchimpConfig } from "@/lib/mailchimp/env";
import { buildHildaMergeFields } from "@/lib/mailchimp/merge-fields";
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

/**
 * Create or update an audience member. Omits `status` on update so existing
 * consent is preserved (Mailchimp only applies `status_if_new` for new contacts).
 */
export async function upsertListMember(input: UpsertListMemberInput): Promise<MailchimpListMember> {
  const audienceId = input.audienceId ?? getMailchimpConfig().audienceId;
  const email = input.email.trim().toLowerCase();
  const subscriberHash = subscriberHashForEmail(email);

  const mergeFields = buildHildaMergeFields({
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
  });

  const row = await mailchimpRequest<MailchimpMemberResponse>({
    method: "PUT",
    path: `/lists/${audienceId}/members/${subscriberHash}`,
    body: {
      email_address: email,
      status_if_new: statusForNewMember(input.marketingConsent),
      merge_fields: mergeFields,
    },
  });

  return mapMemberResponse(row);
}
