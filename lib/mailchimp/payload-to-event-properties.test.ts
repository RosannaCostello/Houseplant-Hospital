import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    APP_BASE_URL: "https://houseplanthospital.hildaedinburgh.workers.dev",
  }),
}));

import { payloadToEventProperties } from "@/lib/mailchimp/payload-to-event-properties";

describe("payloadToEventProperties", () => {
  it("includes care_card_url from visit id and omits notes/tips", () => {
    const visitId = "22222222-2222-4222-8222-222222222222";
    const props = payloadToEventProperties({
      visitId,
      plantId: "33333333-3333-4333-8333-333333333333",
      plantName: "Monstera",
      treatmentNotes: "should not appear",
      careTips: "Water: leave blank",
    });

    expect(props.care_card_url).toBe(
      `https://houseplanthospital.hildaedinburgh.workers.dev/hh/care/${visitId}`,
    );
    expect(props.plant_name).toBe("Monstera");
    expect(props.treatment_notes_1).toBeUndefined();
    expect(props.care_tips_water).toBeUndefined();
  });

  it("prefers explicit careCardUrl on the payload", () => {
    const props = payloadToEventProperties({
      visitId: "22222222-2222-4222-8222-222222222222",
      careCardUrl: "https://example.test/hh/care/custom",
    });
    expect(props.care_card_url).toBe("https://example.test/hh/care/custom");
  });
});
