import { parseCareTip } from "@/lib/care-tips/compose-parse";
import { truncateEventProperty } from "@/lib/mailchimp/truncate-event-property";

export type CareTipsMailchimpProperties = {
  care_tips_water?: string;
  care_tips_leaves?: string;
  care_tips_light?: string;
};

/**
 * Send each care tip option as its own Mailchimp event property (value only —
 * no "Water:" / "Leaves:" / "Light:" prefix), so the email can place them on
 * separate lines.
 */
export function careTipsToMailchimpProperties(
  value: string | null | undefined,
): CareTipsMailchimpProperties {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return {};
  }

  const parsed = parseCareTip(trimmed);
  if (parsed.kind !== "structured") {
    return {};
  }

  return {
    care_tips_water: truncateEventProperty(parsed.selections.water),
    care_tips_leaves: truncateEventProperty(parsed.selections.leaves),
    care_tips_light: truncateEventProperty(parsed.selections.light),
  };
}
