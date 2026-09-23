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
  /** Body HTML using Mailchimp merge tags (*|SPECIES|*, etc.). */
  bodyHtml: string;
  bodyText: string;
};

/**
 * Seed content for Mandrill templates. After seed, edit in Transactional → Outbound → Templates.
 * Merge tags: *|FNAME|* *|SPECIES|* *|CARE_CARD_URL|* *|AWAITING_SUMMARY|* (partial only).
 */
export const HOSPITAL_TRANSACTIONAL_TEMPLATE_SEEDS: readonly HospitalTemplateSeed[] = [
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantCheckedIn,
    name: "hh-plant-checked-in",
    subject: "Checked in at Hilda Houseplant Hospital",
    headline: "We've checked in your plant",
    bodyHtml:
      "Your *|SPECIES|* is with us at Hilda Houseplant Hospital. You can follow progress on your Care Card anytime.",
    bodyText:
      "Your *|SPECIES|* is with us at Hilda Houseplant Hospital. You can follow progress on your Care Card anytime.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantQuarantined,
    name: "hh-plant-quarantined",
    subject: "Your plant is in Quarantine",
    headline: "Quarantine",
    bodyHtml:
      "Your *|SPECIES|* is in Quarantine at the Hospital while we assess and treat. Open your Care Card for the latest status.",
    bodyText:
      "Your *|SPECIES|* is in Quarantine at the Hospital while we assess and treat. Open your Care Card for the latest status.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantInSurgery,
    name: "hh-plant-in-surgery",
    subject: "Your plant is in Surgery",
    headline: "In Surgery",
    bodyHtml:
      "Your *|SPECIES|* is in Surgery with our team. We'll update you when it's ready — you can also check your Care Card.",
    bodyText:
      "Your *|SPECIES|* is in Surgery with our team. We'll update you when it's ready — you can also check your Care Card.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantOutpatient,
    name: "hh-plant-outpatient",
    subject: "Ready for collection at Hilda",
    headline: "Ready for collection",
    bodyHtml:
      "Your *|SPECIES|* is ready to pick up from Hilda. View aftercare details on your Care Card before you visit.",
    bodyText:
      "Your *|SPECIES|* is ready to pick up from Hilda. View aftercare details on your Care Card before you visit.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantOutpatientPartial,
    name: "hh-plant-outpatient-partial",
    subject: "One of your plants is ready",
    headline: "Partial update",
    bodyHtml:
      "We're still working on *|AWAITING_SUMMARY|* — just so you know, your *|SPECIES|* is all set. We'll email again when all your plants are ready. Check your Care Card for details.",
    bodyText:
      "We're still working on *|AWAITING_SUMMARY|* — just so you know, your *|SPECIES|* is all set. We'll email again when all your plants are ready. Check your Care Card for details.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantOutpatientReminder,
    name: "hh-plant-outpatient-reminder",
    subject: "Friendly reminder — plant ready for collection",
    headline: "Still ready for collection",
    bodyHtml:
      "Your *|SPECIES|* is still waiting for collection at Hilda. Open your Care Card for details, or speak to the team in store.",
    bodyText:
      "Your *|SPECIES|* is still waiting for collection at Hilda. Open your Care Card for details, or speak to the team in store.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantDead,
    name: "hh-plant-dead",
    subject: "Update from Hilda Houseplant Hospital",
    headline: "Assessment complete",
    bodyHtml:
      "Please speak to the Hilda team about your *|SPECIES|*. Your Care Card has the latest status.",
    bodyText:
      "Please speak to the Hilda team about your *|SPECIES|*. Your Care Card has the latest status.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.plantPropagated,
    name: "hh-plant-propagated",
    subject: "A new propagation from your plant",
    headline: "Propagation",
    bodyHtml:
      "We've started a new propagation from your *|SPECIES|*. Follow both plants on your Care Card.",
    bodyText:
      "We've started a new propagation from your *|SPECIES|*. Follow both plants on your Care Card.",
  },
  {
    eventName: MAILCHIMP_EVENT_NAMES.bugsFound,
    name: "hh-bugs-found",
    subject: "Pests found on your plant",
    headline: "Pests found",
    bodyHtml:
      "We've found pests on your *|SPECIES|* and are treating them at the Hospital. Open your Care Card for details.",
    bodyText:
      "We've found pests on your *|SPECIES|* and are treating them at the Hospital. Open your Care Card for details.",
  },
];

/** Shared email layout; merge tags remain intact for Mandrill. */
export function wrapHospitalTransactionalTemplateHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#e2e8e8;font-family:Helvetica,Arial,sans-serif;color:#315f5f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e2e8e8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid rgba(23,29,26,0.15);border-radius:12px;padding:28px 24px;">
          <tr><td style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#d3ac54;">Hilda Houseplant Hospital</td></tr>
          <tr><td style="padding-top:20px;font-size:16px;line-height:1.55;color:#315f5f;">Hi *|FNAME|*,</td></tr>
          <tr><td style="padding-top:14px;font-size:16px;line-height:1.55;color:#315f5f;">${bodyHtml}</td></tr>
          <tr>
            <td style="padding-top:24px;">
              <a href="*|CARE_CARD_URL|*" style="display:inline-block;background:#d3ac54;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 18px;border-radius:8px;">View your Care Card</a>
            </td>
          </tr>
          <tr><td style="padding-top:28px;font-size:16px;line-height:1.55;color:#315f5f;">Thanks,<br />Hilda team</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function wrapHospitalTransactionalTemplateText(bodyText: string): string {
  return [
    "Hi *|FNAME|*,",
    "",
    bodyText,
    "",
    "View your Care Card: *|CARE_CARD_URL|*",
    "",
    "Thanks,",
    "Hilda team",
  ].join("\n");
}

export function awaitingSummaryPhrase(count: number | undefined): string {
  if (count == null || !Number.isFinite(count) || count <= 0) {
    return "your other plants";
  }
  if (count === 1) return "1 other plant";
  return `${count} other plants`;
}
