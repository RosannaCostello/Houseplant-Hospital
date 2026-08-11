import type { PlantStatus } from "@/lib/plant-status";

/** Mailchimp journey trigger event names — see scope Email Architecture. */
export const MAILCHIMP_EVENT_NAMES = {
  plantCheckedIn: "plant_checked_in",
  plantInSurgery: "plant_in_surgery",
  bugsFound: "bugs_found",
  plantOutpatient: "plant_outpatient",
  /** Multi-plant visit: this plant is outpatient but siblings still block collection notice. */
  plantOutpatientPartial: "plant_outpatient_partial",
  plantCollected: "plant_collected",
  plantDead: "plant_dead",
  plantQuarantined: "plant_quarantined",
  /** Staff propagated a source plant (creates a child in Propagation). */
  plantPropagated: "plant_propagated",
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
  /** Sibling plants still blocking ready-to-collect (outpatient partial only). */
  awaitingPlantCount?: number;
  /** Plant display name for journey email copy (HIL-98). */
  plantName?: string;
  /** Latest treatment note content (HIL-98). */
  treatmentNotes?: string;
  /** Latest care tips content (HIL-98). */
  careTips?: string;
  /** New propagation child plant id (`plant_propagated` only). */
  childPlantId?: string;
  /** Propagation size band chosen by staff (`plant_propagated` only). */
  size?: string;
  /** Set by outbox worker (HIL-57) when delivery fails. */
  _deliveryError?: string;
  _failedAt?: string;
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
