import type { PlantStatus } from "@/lib/plant-status";

/** Mailchimp journey trigger event names — see scope Email Architecture. */
export const MAILCHIMP_EVENT_NAMES = {
  plantCheckedIn: "plant_checked_in",
  plantInSurgery: "plant_in_surgery",
  bugsFound: "bugs_found",
  plantOutpatient: "plant_outpatient",
  plantCollected: "plant_collected",
  plantDead: "plant_dead",
  plantQuarantined: "plant_quarantined",
} as const;

export type MailchimpEventName = (typeof MAILCHIMP_EVENT_NAMES)[keyof typeof MAILCHIMP_EVENT_NAMES];

const MAILCHIMP_EVENT_NAME_SET = new Set<string>(Object.values(MAILCHIMP_EVENT_NAMES));

export function isMailchimpEventName(value: string): value is MailchimpEventName {
  return MAILCHIMP_EVENT_NAME_SET.has(value);
}

export type MailchimpEventStatus = "pending" | "sent" | "failed";

export type MailchimpEventPayload = {
  customerId?: string;
  visitId?: string;
  plantId?: string;
  email?: string;
  occurredAt?: string;
  previousStatus?: PlantStatus;
  newStatus?: PlantStatus;
  bugsFound?: boolean;
};

/** Map kanban plant status to a Mailchimp event (not used for initial check-in). */
export function mailchimpEventNameForPlantStatus(status: PlantStatus): MailchimpEventName | null {
  switch (status) {
    case "check_in":
      return MAILCHIMP_EVENT_NAMES.plantCheckedIn;
    case "in_surgery":
      return MAILCHIMP_EVENT_NAMES.plantInSurgery;
    case "outpatient":
      return MAILCHIMP_EVENT_NAMES.plantOutpatient;
    case "quarantine":
      return MAILCHIMP_EVENT_NAMES.plantQuarantined;
    case "dead":
      return MAILCHIMP_EVENT_NAMES.plantDead;
    case "collected":
      return MAILCHIMP_EVENT_NAMES.plantCollected;
    default:
      return null;
  }
}
