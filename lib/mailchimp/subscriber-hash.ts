import { createHash } from "crypto";

/** MD5 of lowercase email — Mailchimp subscriber_hash path segment. */
export function subscriberHashForEmail(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}
