import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    APP_BASE_URL: "https://houseplanthospital.hildaedinburgh.workers.dev",
  }),
}));

import { careCardPath, careCardUrlFromEnv } from "@/lib/plants/plant-case-url";

describe("careCardUrlFromEnv", () => {
  it("builds the visit Care Card URL", () => {
    const visitId = "11111111-1111-4111-8111-111111111111";
    expect(careCardPath(visitId)).toBe(`/hh/care/${visitId}`);
    expect(careCardUrlFromEnv(visitId)).toBe(
      `https://houseplanthospital.hildaedinburgh.workers.dev/hh/care/${visitId}`,
    );
  });
});
