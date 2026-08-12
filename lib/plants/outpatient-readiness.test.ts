import { describe, expect, it } from "vitest";
import { formatOutpatientReadinessMessage } from "@/lib/plants/outpatient-readiness";

describe("formatOutpatientReadinessMessage", () => {
  it("uses dedicated copy for pest treatments only", () => {
    expect(formatOutpatientReadinessMessage(["pest_treatments"])).toBe(
      "Complete all three pest treatments before Outpatient.",
    );
  });

  it("lists multiple missing items", () => {
    const message = formatOutpatientReadinessMessage([
      "pests",
      "treatment_notes",
      "care_tips",
    ]);
    expect(message).toContain("resolve pests to Yes or No");
    expect(message).toContain("add treatment notes");
    expect(message).toContain("choose at least one care tip");
  });
});
