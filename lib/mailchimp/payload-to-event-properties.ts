import { careCardUrlFromEnv } from "@/lib/plants/plant-case-url";
import type { MailchimpEventPayload } from "@/lib/mailchimp/event-types";
import { truncateEventProperty } from "@/lib/mailchimp/truncate-event-property";

/**
 * Map queued payload → Mailchimp Events API properties.
 * Thin emails (HIL-139): no treatment notes / care tips — aftercare is on the Care Card.
 */
export function payloadToEventProperties(payload: MailchimpEventPayload): Record<string, string> {
  const properties: Record<string, string> = {};

  if (payload.visitId) properties.visit_id = payload.visitId;
  if (payload.plantId) properties.plant_id = payload.plantId;
  if (payload.customerId) properties.customer_id = payload.customerId;
  if (payload.previousStatus) properties.previous_status = payload.previousStatus;
  if (payload.newStatus) properties.new_status = payload.newStatus;
  if (payload.bugsFound !== undefined) properties.bugs_found = String(payload.bugsFound);
  if (payload.awaitingPlantCount !== undefined) {
    properties.awaiting_plant_count = String(payload.awaitingPlantCount);
  }
  if (payload.childPlantId) properties.child_plant_id = payload.childPlantId;
  if (payload.size) properties.size = truncateEventProperty(payload.size);
  const species =
    payload.species?.trim() ||
    // Legacy queued rows still used plantName (was plant display name / species).
    (typeof (payload as { plantName?: string }).plantName === "string"
      ? (payload as { plantName?: string }).plantName!.trim()
      : "");
  if (species) {
    properties.species = truncateEventProperty(species);
    // Legacy alias for older Journey templates still using plant_name.
    properties.plant_name = truncateEventProperty(species);
  }

  const careCardUrl =
    payload.careCardUrl?.trim() ||
    (payload.visitId ? careCardUrlFromEnv(payload.visitId) : null);
  if (careCardUrl) {
    properties.care_card_url = truncateEventProperty(careCardUrl);
  }

  return properties;
}
