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

export function isHospitalTransactionalEvent(eventName: MailchimpEventName): boolean {
  return HOSPITAL_TRANSACTIONAL_EVENTS.has(eventName);
}
