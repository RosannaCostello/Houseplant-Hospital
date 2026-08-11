import { describe, expect, it } from "vitest";
import { shouldEmitPlantInSurgeryEvent } from "@/lib/mailchimp/surgery-event-gate";

describe("shouldEmitPlantInSurgeryEvent", () => {
  it("fires for a single plant entering surgery", () => {
    expect(
      shouldEmitPlantInSurgeryEvent("a", [{ id: "a", status: "in_surgery" }]),
    ).toBe(true);
  });

  it("fires for the first of several plants entering surgery", () => {
    expect(
      shouldEmitPlantInSurgeryEvent("a", [
        { id: "a", status: "in_surgery" },
        { id: "b", status: "check_in" },
        { id: "c", status: "quarantine" },
      ]),
    ).toBe(true);
  });

  it("skips when a sibling is already in surgery", () => {
    expect(
      shouldEmitPlantInSurgeryEvent("b", [
        { id: "a", status: "in_surgery" },
        { id: "b", status: "in_surgery" },
        { id: "c", status: "check_in" },
      ]),
    ).toBe(false);
  });

  it("skips when a sibling is already outpatient / collected / dead", () => {
    expect(
      shouldEmitPlantInSurgeryEvent("b", [
        { id: "a", status: "outpatient" },
        { id: "b", status: "in_surgery" },
      ]),
    ).toBe(false);
    expect(
      shouldEmitPlantInSurgeryEvent("b", [
        { id: "a", status: "collected" },
        { id: "b", status: "in_surgery" },
      ]),
    ).toBe(false);
    expect(
      shouldEmitPlantInSurgeryEvent("b", [
        { id: "a", status: "dead" },
        { id: "b", status: "in_surgery" },
      ]),
    ).toBe(false);
  });
});
