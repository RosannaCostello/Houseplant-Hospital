import {
  MAILCHIMP_EVENT_NAMES,
  type MailchimpEventName,
} from "@/lib/mailchimp/event-types";
import { isHospitalTransactionalEvent } from "@/lib/mailchimp/hospital-transactional-events";

/** Mandrill template slug per hospital event (edit copy/layout in Transactional UI). */
export const HOSPITAL_TRANSACTIONAL_TEMPLATE_BY_EVENT: Record<
  Exclude<MailchimpEventName, "plant_collected">,
  string
> = {
  [MAILCHIMP_EVENT_NAMES.plantCheckedIn]: "hh-plant-checked-in",
  [MAILCHIMP_EVENT_NAMES.plantQuarantined]: "hh-plant-quarantined",
  [MAILCHIMP_EVENT_NAMES.plantInSurgery]: "hh-plant-in-surgery",
  [MAILCHIMP_EVENT_NAMES.plantOutpatient]: "hh-plant-outpatient",
  [MAILCHIMP_EVENT_NAMES.plantOutpatientPartial]: "hh-plant-outpatient-partial",
  [MAILCHIMP_EVENT_NAMES.plantOutpatientReminder]: "hh-plant-outpatient-reminder",
  [MAILCHIMP_EVENT_NAMES.plantDead]: "hh-plant-dead",
  [MAILCHIMP_EVENT_NAMES.plantPropagated]: "hh-plant-propagated",
  [MAILCHIMP_EVENT_NAMES.bugsFound]: "hh-bugs-found",
};

export function hospitalTransactionalTemplateName(
  eventName: MailchimpEventName,
): string | null {
  if (!isHospitalTransactionalEvent(eventName)) return null;
  return HOSPITAL_TRANSACTIONAL_TEMPLATE_BY_EVENT[
    eventName as Exclude<MailchimpEventName, "plant_collected">
  ];
}

export type HospitalTemplateSeed = {
  eventName: Exclude<MailchimpEventName, "plant_collected">;
  name: string;
  subject: string;
  headline: string;
  /** Body HTML using Mailchimp merge tags (*|PLANT_NAME|*, etc.). */
  bodyHtml: string;
  bodyText: string;
};

/**
 * Seed content for Mandrill templates. After seed, edit in Transactional → Outbound → Templates.
 * Merge tags: *|PLANT_NAME|* *|CARE_CARD_URL|* *|AWAITING_SUMMARY|* (partial only).
 */
export const HOSPITAL_TRANSACTIONAL_TEMPLATE_SEEDS: readonly HospitalTemplateSeed[] = [
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantCheckedIn,
    name: "hh-plant-checked-in",
    subject: "Checked in at Hilda Houseplant Hospital",
    headline: "We've checked in your plant",
    bodyHtml:
      "*|PLANT_NAME|* is with us at Hilda Houseplant Hospital. You can follow progress on your Care Card anytime.",
    bodyText:
      "*|PLANT_NAME|* is with us at Hilda Houseplant Hospital. You can follow progress on your Care Card anytime.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantQuarantined,
    name: "hh-plant-quarantined",
    subject: "Your plant is in Quarantine",
    headline: "Quarantine",
    bodyHtml:
      "*|PLANT_NAME|* is in Quarantine at the Hospital while we assess and treat. Open your Care Card for the latest status.",
    bodyText:
      "*|PLANT_NAME|* is in Quarantine at the Hospital while we assess and treat. Open your Care Card for the latest status.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantInSurgery,
    name: "hh-plant-in-surgery",
    subject: "Your plant is in Surgery",
    headline: "In Surgery",
    bodyHtml:
      "*|PLANT_NAME|* is in Surgery with our team. We'll update you when it's ready — you can also check your Care Card.",
    bodyText:
      "*|PLANT_NAME|* is in Surgery with our team. We'll update you when it's ready — you can also check your Care Card.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantOutpatient,
    name: "hh-plant-outpatient",
    subject: "Ready for collection at Hilda",
    headline: "Ready for collection",
    bodyHtml:
      "*|PLANT_NAME|* is ready to pick up from Hilda. View aftercare details on your Care Card before you visit.",
    bodyText:
      "*|PLANT_NAME|* is ready to pick up from Hilda. View aftercare details on your Care Card before you visit.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantOutpatientPartial,
    name: "hh-plant-outpatient-partial",
    subject: "One of your plants is ready",
    headline: "Partial update",
    bodyHtml:
      "*|PLANT_NAME|* is ready, but *|AWAITING_SUMMARY|*. We'll email again when the whole drop-off is ready. Check your Care Card for details.",
    bodyText:
      "*|PLANT_NAME|* is ready, but *|AWAITING_SUMMARY|*. We'll email again when the whole drop-off is ready. Check your Care Card for details.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantOutpatientReminder,
    name: "hh-plant-outpatient-reminder",
    subject: "Friendly reminder — plant ready for collection",
    headline: "Still ready for collection",
    bodyHtml:
      "*|PLANT_NAME|* is still waiting for collection at Hilda. Open your Care Card for details, or speak to the team in store.",
    bodyText:
      "*|PLANT_NAME|* is still waiting for collection at Hilda. Open your Care Card for details, or speak to the team in store.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantDead,
    name: "hh-plant-dead",
    subject: "Update from Hilda Houseplant Hospital",
    headline: "Assessment complete",
    bodyHtml:
      "Please speak to the Hilda team about *|PLANT_NAME|*. Your Care Card has the latest status.",
    bodyText:
      "Please speak to the Hilda team about *|PLANT_NAME|*. Your Care Card has the latest status.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantPropagated,
    name: "hh-plant-propagated",
    subject: "A new propagation from your plant",
    headline: "Propagation",
    bodyHtml:
      "We've started a new propagation from *|PLANT_NAME|*. Follow both plants on your Care Card.",
    bodyText:
      "We've started a new propagation from *|PLANT_NAME|*. Follow both plants on your Care Card.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.bugsFound,
    name: "hh-bugs-found",
    subject: "Pests found on your plant",
    headline: "Pests found",
    bodyHtml:
      "We've found pests on *|PLANT_NAME|* and are treating them at the Hospital. Open your Care Card for details.",
    bodyText:
      "We've found pests on *|PLANT_NAME|* and are treating them at the Hospital. Open your Care Card for details.",
  },
];

/** Shared layout wrapper; merge tags remain intact for Mandrill. */
export function wrapHospitalTransactionalTemplateHtml(input: {
  headline: string;
  bodyHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#f7f4ef;font-family:Georgia,'Times New Roman',serif;color:#2c2a26;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f4ef;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#fffdf9;border:1px solid #e6e0d6;border-radius:12px;padding:28px 24px;">
          <tr><td style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#b08d3a;font-family:Helvetica,Arial,sans-serif;">Hilda Houseplant Hospital</td></tr>
          <tr><td style="padding-top:12px;font-size:26px;line-height:1.25;color:#2c2a26;">${input.headline}</td></tr>
          <tr><td style="padding-top:14px;font-size:16px;line-height:1.55;font-family:Helvetica,Arial,sans-serif;color:#4a463f;">${input.bodyHtml}</td></tr>
          <tr>
            <td style="padding-top:24px;">
              <a href="*|CARE_CARD_URL|*" style="display:inline-block;background:#b08d3a;color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;padding:12px 18px;border-radius:8px;">View your Care Card</a>
            </td>
          </tr>
          <tr><td style="padding-top:18px;font-size:13px;line-height:1.45;font-family:Helvetica,Arial,sans-serif;color:#7a746a;">Or open: <a href="*|CARE_CARD_URL|*" style="color:#b08d3a;">*|CARE_CARD_URL|*</a></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function wrapHospitalTransactionalTemplateText(input: {
  headline: string;
  bodyText: string;
}): string {
  return [
    input.headline,
    "",
    input.bodyText,
    "",
    "View your Care Card: *|CARE_CARD_URL|*",
    "",
    "— Hilda Houseplant Hospital",
  ].join("\n");
}

export function awaitingSummaryPhrase(count: number | undefined): string {
  if (count == null || !Number.isFinite(count) || count <= 0) {
    return "other plants on this drop-off are still with us";
  }
  if (count === 1) return "1 other plant is still with us";
  return `${count} other plants are still with us`;
}
