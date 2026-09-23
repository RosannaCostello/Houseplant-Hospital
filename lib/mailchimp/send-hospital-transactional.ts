import "server-only";

import type { MailchimpEventName } from "@/lib/mailchimp/event-types";
import type { MailchimpEventPayload } from "@/lib/mailchimp/event-types";
import { payloadToEventProperties } from "@/lib/mailchimp/payload-to-event-properties";
import { mandrillRequest } from "@/lib/mailchimp/transactional-client";
import { getMailchimpTransactionalConfig } from "@/lib/mailchimp/transactional-env";
import {
  buildHospitalTransactionalHtml,
  buildHospitalTransactionalText,
  hospitalTransactionalCopy,
} from "@/lib/mailchimp/hospital-transactional-copy";

export type SendHospitalTransactionalInput = {
  email: string;
  eventName: MailchimpEventName;
  payload: MailchimpEventPayload;
  /** Optional display name for the To: header. */
  toName?: string;
};

/**
 * Route A — send a hospital service email via Mailchimp Transactional (Mandrill).
 * Uses app-composed thin HTML (Care Card CTA). Not used for `plant_collected`.
 */
export async function sendHospitalTransactionalEmail(
  input: SendHospitalTransactionalInput,
): Promise<void> {
  const { fromEmail, fromName } = getMailchimpTransactionalConfig();
  const email = input.email.trim().toLowerCase();
  const properties = payloadToEventProperties(input.payload);
  const careCardUrl = properties.care_card_url?.trim();

  if (!careCardUrl) {
    throw new Error("care_card_url is required for Transactional hospital emails (set APP_BASE_URL).");
  }

  const awaitingRaw = properties.awaiting_plant_count;
  const awaitingPlantCount = awaitingRaw ? Number.parseInt(awaitingRaw, 10) : undefined;

  const copy = hospitalTransactionalCopy(input.eventName, {
    plantName: properties.plant_name,
    awaitingPlantCount: Number.isFinite(awaitingPlantCount) ? awaitingPlantCount : undefined,
  });

  const html = buildHospitalTransactionalHtml({
    headline: copy.headline,
    body: copy.body,
    careCardUrl,
  });
  const text = buildHospitalTransactionalText({
    headline: copy.headline,
    body: copy.body,
    careCardUrl,
  });

  await mandrillRequest({
    path: "messages/send",
    body: {
      message: {
        html,
        text,
        subject: copy.subject,
        from_email: fromEmail,
        from_name: fromName,
        to: [
          {
            email,
            ...(input.toName?.trim() ? { name: input.toName.trim() } : {}),
            type: "to",
          },
        ],
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
