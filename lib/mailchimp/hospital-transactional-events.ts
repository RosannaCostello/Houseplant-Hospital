import {
  MAILCHIMP_EVENT_NAMES,
  type MailchimpEventName,
} from "@/lib/mailchimp/event-types";

/** Hospital service emails go via Transactional (Route A). Collection stays on Journeys. */
const HOSPITAL_TRANSACTIONAL_EVENTS = new Set<MailchimpEventName>([
  MAILCHIMP_EVENT_NAMES.plantCheckedIn,
  MAILCHIMP_EVENT_NAMES.plantQuarantined,
  MAILCHIMP_EVENT_NAMES.plantInSurgery,
  MAILCHIMP_EVENT_NAMES.plantOutpatient,
  MAILCHIMP_EVENT_NAMES.plantOutpatientPartial,
  MAILCHIMP_EVENT_NAMES.plantOutpatientReminder,
  MAILCHIMP_EVENT_NAMES.plantDead,
  MAILCHIMP_EVENT_NAMES.plantPropagated,
  MAILCHIMP_EVENT_NAMES.bugsFound,
]);

/**
 * Events that still queue + keep a Mandrill template, but must not send live email.
 * `plant_dead`: draft template only — staff confirm customer was emailed before Dead move.
 */
const SUPPRESSED_HOSPITAL_EMAIL_EVENTS = new Set<MailchimpEventName>([
  MAILCHIMP_EVENT_NAMES.plantDead,
]);

export function isHospitalTransactionalEvent(eventName: MailchimpEventName): boolean {
  return HOSPITAL_TRANSACTIONAL_EVENTS.has(eventName);
}

/** True when the outbox should acknowledge the event without delivering mail. */
export function isSuppressedHospitalEmail(eventName: MailchimpEventName): boolean {
  return SUPPRESSED_HOSPITAL_EMAIL_EVENTS.has(eventName);
}
