import { describe, expect, it } from "vitest";
import {
  awaitingSummaryPhrase,
  hospitalTransactionalTemplateName,
  HOSPITAL_TRANSACTIONAL_TEMPLATE_BY_EVENT,
} from "@/lib/mailchimp/hospital-transactional-templates";
import { isHospitalTransactionalEvent } from "@/lib/mailchimp/hospital-transactional-events";

describe("hospital transactional templates", () => {
  it("maps every hospital event to a hh- template slug", () => {
    expect(hospitalTransactionalTemplateName("plant_checked_in")).toBe("hh-plant-checked-in");
    expect(hospitalTransactionalTemplateName("bugs_found")).toBe("hh-bugs-found");
    expect(hospitalTransactionalTemplateName("plant_collected")).toBeNull();
    expect(Object.keys(HOSPITAL_TRANSACTIONAL_TEMPLATE_BY_EVENT).length).toBe(9);
  });

  it("keeps collected off Transactional routing", () => {
    expect(isHospitalTransactionalEvent("plant_collected")).toBe(false);
  });

  it("builds awaiting summary phrases", () => {
    expect(awaitingSummaryPhrase(1)).toBe("1 other plant");
    expect(awaitingSummaryPhrase(3)).toBe("3 other plants");
    expect(awaitingSummaryPhrase(undefined)).toBe("your other plants");
  });
});
