import "server-only";

import { mailchimpRequest } from "@/lib/mailchimp/client";
import { getMailchimpConfig } from "@/lib/mailchimp/env";
import { subscriberHashForEmail } from "@/lib/mailchimp/subscriber-hash";

export type MemberTagUpdate = {
  name: string;
  active: boolean;
};

type UpdateMemberTagsInput = {
  email: string;
  tags: MemberTagUpdate[];
  audienceId?: string;
};

/** Apply active/inactive tags to a list member. */
export async function updateMemberTags(input: UpdateMemberTagsInput): Promise<void> {
  const audienceId = input.audienceId ?? getMailchimpConfig().audienceId;
  const subscriberHash = subscriberHashForEmail(input.email);

  if (input.tags.length === 0) {
    return;
  }

  await mailchimpRequest({
    method: "POST",
    path: `/lists/${audienceId}/members/${subscriberHash}/tags`,
    body: {
      tags: input.tags.map((tag) => ({
        name: tag.name,
        status: tag.active ? "active" : "inactive",
      })),
    },
  });
}

/** Convenience: activate one or more tags on a member. */
export async function addMemberTags(
  email: string,
  tagNames: string[],
  audienceId?: string,
): Promise<void> {
  await updateMemberTags({
    email,
    audienceId,
    tags: tagNames.map((name) => ({ name, active: true })),
  });
}

/** Convenience: deactivate one or more tags on a member. */
export async function removeMemberTags(
  email: string,
  tagNames: string[],
  audienceId?: string,
): Promise<void> {
  await updateMemberTags({
    email,
    audienceId,
    tags: tagNames.map((name) => ({ name, active: false })),
  });
}
