import { describe, expect, it } from "vitest";
import { showCustomerAftercare } from "@/lib/plants/customer-aftercare";

describe("showCustomerAftercare", () => {
  it("hides notes during early hospital statuses", () => {
    expect(showCustomerAftercare("check_in")).toBe(false);
    expect(showCustomerAftercare("quarantine")).toBe(false);
    expect(showCustomerAftercare("in_surgery")).toBe(false);
    expect(showCustomerAftercare("propagation")).toBe(false);
  });

  it("shows notes after surgery handoff statuses", () => {
    expect(showCustomerAftercare("outpatient")).toBe(true);
    expect(showCustomerAftercare("collected")).toBe(true);
    expect(showCustomerAftercare("dead")).toBe(true);
  });
});
