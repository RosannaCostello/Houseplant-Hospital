import "server-only";

import type { MailchimpEventName } from "@/lib/mailchimp/event-types";
import type { MailchimpEventPayload } from "@/lib/mailchimp/event-types";
import {
  awaitingSummaryPhrase,
  hospitalTransactionalTemplateName,
} from "@/lib/mailchimp/hospital-transactional-templates";
import { payloadToEventProperties } from "@/lib/mailchimp/payload-to-event-properties";
import { mandrillRequest } from "@/lib/mailchimp/transactional-client";
import { getMailchimpTransactionalConfig } from "@/lib/mailchimp/transactional-env";

export type SendHospitalTransactionalInput = {
  email: string;
  eventName: MailchimpEventName;
  payload: MailchimpEventPayload;
  /** Optional display name for the To: header. */
  toName?: string;
};

type MandrillMergeVar = { name: string; content: string };

/**
 * Route A — send via Mandrill template (`messages/send-template`).
 * Edit copy/layout in Transactional → Outbound → Templates (slug `hh-…`).
 * Not used for `plant_collected`.
 */
export async function sendHospitalTransactionalEmail(
  input: SendHospitalTransactionalInput,
): Promise<void> {
  const { fromEmail, fromName } = getMailchimpTransactionalConfig();
  const email = input.email.trim().toLowerCase();
  const properties = payloadToEventProperties(input.payload);
  const careCardUrl = properties.care_card_url?.trim();
  const templateName = hospitalTransactionalTemplateName(input.eventName);

  if (!templateName) {
    throw new Error(`No Transactional template mapped for event ${input.eventName}`);
  }

  if (!careCardUrl) {
    throw new Error("care_card_url is required for Transactional hospital emails (set APP_BASE_URL).");
  }

  const speciesLabel = properties.species?.trim() || "your plant";
  const awaitingRaw = properties.awaiting_plant_count;
  const awaitingCount = awaitingRaw ? Number.parseInt(awaitingRaw, 10) : undefined;

  const globalMergeVars: MandrillMergeVar[] = [
    { name: "CARE_CARD_URL", content: careCardUrl },
    { name: "SPECIES", content: speciesLabel },
    { name: "AWAITING_SUMMARY", content: awaitingSummaryPhrase(awaitingCount) },
  ];

  await mandrillRequest({
    path: "messages/send-template",
    body: {
      template_name: templateName,
      template_content: [],
      message: {
        from_email: fromEmail,
        from_name: fromName,
        to: [
          {
            email,
            ...(input.toName?.trim() ? { name: input.toName.trim() } : {}),
            type: "to",
          },
        ],
        merge: true,
        merge_language: "mailchimp",
        global_merge_vars: globalMergeVars,
        track_opens: true,
        track_clicks: true,
        metadata: {
          event_name: input.eventName,
          ...(properties.visit_id ? { visit_id: properties.visit_id } : {}),
          ...(properties.plant_id ? { plant_id: properties.plant_id } : {}),
        },
        tags: ["houseplant_hospital", input.eventName],
      },
      async: false,
    },
  });
}
