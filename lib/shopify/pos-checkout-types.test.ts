import { describe, expect, it } from "vitest";
import { isVisitUnpaid } from "@/lib/shopify/pos-checkout-types";

describe("isVisitUnpaid", () => {
  it("treats null and undefined as unpaid", () => {
    expect(isVisitUnpaid(null)).toBe(true);
    expect(isVisitUnpaid(undefined)).toBe(true);
  });

  it("treats not_started and cancelled as unpaid", () => {
    expect(isVisitUnpaid("not_started")).toBe(true);
    expect(isVisitUnpaid("cancelled")).toBe(true);
  });

  it("treats queued, loaded, and pay_at_collection as unpaid", () => {
    expect(isVisitUnpaid("queued")).toBe(true);
    expect(isVisitUnpaid("loaded")).toBe(true);
    expect(isVisitUnpaid("pay_at_collection")).toBe(true);
  });

  it("treats paid as paid", () => {
    expect(isVisitUnpaid("paid")).toBe(false);
  });
});
