import type { MailchimpEventName } from "@/lib/mailchimp/event-types";
import { MAILCHIMP_EVENT_NAMES } from "@/lib/mailchimp/event-types";

export type HospitalTransactionalCopy = {
  subject: string;
  headline: string;
  body: string;
};

function plantLabel(plantName?: string): string {
  const trimmed = plantName?.trim();
  return trimmed || "your plant";
}

/**
 * Thin hospital email copy (Route A). Detail lives on the Care Card.
 */
export function hospitalTransactionalCopy(
  eventName: MailchimpEventName,
  options: { plantName?: string; awaitingPlantCount?: number } = {},
): HospitalTransactionalCopy {
  const plant = plantLabel(options.plantName);
  const awaiting = options.awaitingPlantCount;

  switch (eventName) {
    case MAILCHIMP_EVENT_NAMES.plantCheckedIn:
      return {
        subject: "Checked in at Hilda Houseplant Hospital",
        headline: "We've checked in your plant",
        body: `${plant} is with us at Hilda Houseplant Hospital. You can follow progress on your Care Card anytime.`,
      };
    case MAILCHIMP_EVENT_NAMES.plantQuarantined:
      return {
        subject: "Your plant is in Quarantine",
        headline: "Quarantine",
        body: `${plant} is in Quarantine at the Hospital while we assess and treat. Open your Care Card for the latest status.`,
      };
    case MAILCHIMP_EVENT_NAMES.plantInSurgery:
      return {
        subject: "Your plant is in Surgery",
        headline: "In Surgery",
        body: `${plant} is in Surgery with our team. We'll update you when it's ready — you can also check your Care Card.`,
      };
    case MAILCHIMP_EVENT_NAMES.plantOutpatient:
      return {
        subject: "Ready for collection at Hilda",
        headline: "Ready for collection",
        body: `${plant} is ready to pick up from Hilda. View aftercare details on your Care Card before you visit.`,
      };
    case MAILCHIMP_EVENT_NAMES.plantOutpatientPartial:
      return {
        subject: "One of your plants is ready",
        headline: "Partial update",
        body:
          awaiting != null && awaiting > 0
            ? `${plant} is ready, but ${awaiting === 1 ? "1 other plant is" : `${awaiting} other plants are`} still with us. We'll email again when the whole drop-off is ready. Check your Care Card for details.`
            : `${plant} is ready, but other plants on this drop-off are still with us. Check your Care Card for details.`,
      };
    case MAILCHIMP_EVENT_NAMES.plantOutpatientReminder:
      return {
        subject: "Friendly reminder — plant ready for collection",
        headline: "Still ready for collection",
        body: `${plant} is still waiting for collection at Hilda. Open your Care Card for details, or speak to the team in store.`,
      };
    case MAILCHIMP_EVENT_NAMES.plantDead:
      return {
        subject: "Update from Hilda Houseplant Hospital",
        headline: "Assessment complete",
        body: `Please speak to the Hilda team about ${plant}. Your Care Card has the latest status.`,
      };
    case MAILCHIMP_EVENT_NAMES.plantPropagated:
      return {
        subject: "A new propagation from your plant",
        headline: "Propagation",
        body: `We've started a new propagation from ${plant}. Follow both plants on your Care Card.`,
      };
    case MAILCHIMP_EVENT_NAMES.bugsFound:
      return {
        subject: "Pests found on your plant",
        headline: "Pests found",
        body: `We've found pests on ${plant} and are treating them at the Hospital. Open your Care Card for details.`,
      };
    default:
      return {
        subject: "Update from Hilda Houseplant Hospital",
        headline: "Hospital update",
        body: `There's an update for ${plant}. Open your Care Card for the latest status.`,
      };
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildHospitalTransactionalHtml(input: {
  headline: string;
  body: string;
  careCardUrl: string;
}): string {
  const headline = escapeHtml(input.headline);
  const body = escapeHtml(input.body);
  const url = escapeHtml(input.careCardUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#f7f4ef;font-family:Georgia,'Times New Roman',serif;color:#2c2a26;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f4ef;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#fffdf9;border:1px solid #e6e0d6;border-radius:12px;padding:28px 24px;">
          <tr><td style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#b08d3a;font-family:Helvetica,Arial,sans-serif;">Hilda Houseplant Hospital</td></tr>
          <tr><td style="padding-top:12px;font-size:26px;line-height:1.25;color:#2c2a26;">${headline}</td></tr>
          <tr><td style="padding-top:14px;font-size:16px;line-height:1.55;font-family:Helvetica,Arial,sans-serif;color:#4a463f;">${body}</td></tr>
          <tr>
            <td style="padding-top:24px;">
              <a href="${url}" style="display:inline-block;background:#b08d3a;color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;padding:12px 18px;border-radius:8px;">View your Care Card</a>
            </td>
          </tr>
          <tr><td style="padding-top:18px;font-size:13px;line-height:1.45;font-family:Helvetica,Arial,sans-serif;color:#7a746a;">Or open: <a href="${url}" style="color:#b08d3a;">${url}</a></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildHospitalTransactionalText(input: {
  headline: string;
  body: string;
  careCardUrl: string;
}): string {
  return [
    input.headline,
    "",
    input.body,
    "",
    `View your Care Card: ${input.careCardUrl}`,
    "",
    "— Hilda Houseplant Hospital",
  ].join("\n");
}
