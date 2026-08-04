import { describe, expect, it } from "vitest";
import {
  allowedPlantStatusTransitions,
  canTransitionPlantStatus,
} from "@/lib/plant-status";

describe("plant status transitions", () => {
  it("allows check_in to quarantine or surgery", () => {
    expect(allowedPlantStatusTransitions("check_in")).toEqual(["quarantine", "in_surgery"]);
    expect(canTransitionPlantStatus("check_in", "quarantine")).toBe(true);
    expect(canTransitionPlantStatus("check_in", "collected")).toBe(false);
  });

  it("treats collected and dead as terminal", () => {
    expect(allowedPlantStatusTransitions("collected")).toEqual([]);
    expect(allowedPlantStatusTransitions("dead")).toEqual([]);
  });

  it("requires outpatient before collected", () => {
    expect(canTransitionPlantStatus("outpatient", "collected")).toBe(true);
    expect(canTransitionPlantStatus("in_surgery", "collected")).toBe(false);
  });
});
