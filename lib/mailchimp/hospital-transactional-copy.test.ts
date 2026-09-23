import { describe, expect, it } from "vitest";
import { hospitalTransactionalCopy } from "@/lib/mailchimp/hospital-transactional-copy";
import { isHospitalTransactionalEvent } from "@/lib/mailchimp/hospital-transactional-events";

describe("isHospitalTransactionalEvent", () => {
  it("routes hospital events to Transactional and keeps collected on Journeys", () => {
    expect(isHospitalTransactionalEvent("plant_checked_in")).toBe(true);
    expect(isHospitalTransactionalEvent("plant_outpatient")).toBe(true);
    expect(isHospitalTransactionalEvent("bugs_found")).toBe(true);
    expect(isHospitalTransactionalEvent("plant_collected")).toBe(false);
  });
});

describe("hospitalTransactionalCopy", () => {
  it("mentions Care Card and Quarantine for quarantine events", () => {
    const copy = hospitalTransactionalCopy("plant_quarantined", { plantName: "Fern" });
    expect(copy.subject.toLowerCase()).toContain("quarantine");
    expect(copy.body).toContain("Fern");
    expect(copy.body.toLowerCase()).toContain("care card");
  });
});
