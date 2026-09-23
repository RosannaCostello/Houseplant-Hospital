import { describe, expect, it } from "vitest";
import {
  isMailchimpSubscribeComplianceError,
  shouldAttemptSubscribeRepair,
} from "@/lib/mailchimp/subscribe-status-repair";

describe("shouldAttemptSubscribeRepair", () => {
  it("repairs unsubscribed when consent is on", () => {
    expect(shouldAttemptSubscribeRepair(true, "unsubscribed")).toBe(true);
  });

  it("repairs transactional when consent is on", () => {
    expect(shouldAttemptSubscribeRepair(true, "transactional")).toBe(true);
  });

  it("does not repair when consent is off", () => {
    expect(shouldAttemptSubscribeRepair(false, "unsubscribed")).toBe(false);
    expect(shouldAttemptSubscribeRepair(false, "transactional")).toBe(false);
  });

  it("never repairs cleaned or already-subscribed", () => {
    expect(shouldAttemptSubscribeRepair(true, "cleaned")).toBe(false);
    expect(shouldAttemptSubscribeRepair(true, "subscribed")).toBe(false);
    expect(shouldAttemptSubscribeRepair(true, "pending")).toBe(false);
  });
});

describe("isMailchimpSubscribeComplianceError", () => {
  it("detects Mailchimp compliance refusals", () => {
    expect(
      isMailchimpSubscribeComplianceError(
        new Error(
          "foo@example.com is in a compliance state due to unsubscribe, bounce, or compliance review and cannot be subscribed.",
        ),
      ),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isMailchimpSubscribeComplianceError(new Error("Your merge fields were invalid."))).toBe(
      false,
    );
    expect(isMailchimpSubscribeComplianceError(null)).toBe(false);
  });
});
