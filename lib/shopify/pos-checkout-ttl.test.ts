import { describe, expect, it } from "vitest";
import {
  isPosCheckoutQueueExpired,
  POS_CHECKOUT_QUEUE_TTL_MS,
} from "@/lib/shopify/pos-checkout-ttl";

describe("isPosCheckoutQueueExpired", () => {
  it("returns false when queued within 24h", () => {
    const now = Date.parse("2026-08-11T12:00:00.000Z");
    expect(
      isPosCheckoutQueueExpired(new Date(now - POS_CHECKOUT_QUEUE_TTL_MS + 60_000).toISOString(), now),
    ).toBe(false);
  });

  it("returns true when queued 24h or more ago", () => {
    const now = Date.parse("2026-08-11T12:00:00.000Z");
    expect(
      isPosCheckoutQueueExpired(new Date(now - POS_CHECKOUT_QUEUE_TTL_MS).toISOString(), now),
    ).toBe(true);
  });

  it("returns false for missing timestamps", () => {
    expect(isPosCheckoutQueueExpired(null)).toBe(false);
  });
});
