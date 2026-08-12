import {
  hasMinimumCareTipSelections,
  parseCareTip,
} from "@/lib/care-tips/compose-parse";
import { truncateEventProperty } from "@/lib/mailchimp/truncate-event-property";

export type CareTipsMailchimpProperties = {
  care_tips_water?: string;
  care_tips_leaves?: string;
  care_tips_light?: string;
};

/**
 * Send each care tip option as its own Mailchimp event property (value only —
 * no "Water:" / "Leaves:" / "Light:" prefix), so the email can place them on
 * separate lines. Blank tips are omitted (no property / no characters).
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

  const properties: CareTipsMailchimpProperties = {};
  const water = truncateEventProperty(parsed.selections.water);
  const leaves = truncateEventProperty(parsed.selections.leaves);
  const light = truncateEventProperty(parsed.selections.light);

  if (water) properties.care_tips_water = water;
  if (leaves) properties.care_tips_leaves = leaves;
  if (light) properties.care_tips_light = light;

  return properties;
}

export function careTipsHaveMinimumForMailchimp(value: string | null | undefined): boolean {
  const parsed = parseCareTip(value);
  return parsed.kind === "structured" && hasMinimumCareTipSelections(parsed.selections);
}
