/** Mailchimp Events API property values must be strings ≤ 255 chars. */
export const MAILCHIMP_EVENT_PROPERTY_MAX = 255;

export function truncateEventProperty(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAILCHIMP_EVENT_PROPERTY_MAX) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAILCHIMP_EVENT_PROPERTY_MAX - 3)}...`;
}
