import { describe, expect, it } from "vitest";
import { customerPlantStatus } from "@/lib/plants/customer-status";

describe("customerPlantStatus", () => {
  it("uses Hospital lane names for quarantine and surgery", () => {
    expect(customerPlantStatus("quarantine").label).toBe("Quarantine");
    expect(customerPlantStatus("in_surgery").label).toBe("In Surgery");
  });

  it("keeps collection-friendly outpatient wording", () => {
    expect(customerPlantStatus("outpatient").label).toBe("Ready for collection");
  });
});
