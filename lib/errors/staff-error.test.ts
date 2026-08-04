import { describe, expect, it } from "vitest";
import { toStaffErrorMessage } from "@/lib/errors/staff-error";

describe("toStaffErrorMessage", () => {
  it("maps auth errors", () => {
    expect(toStaffErrorMessage(new Error("JWT expired"))).toBe("You must be signed in to continue.");
  });

  it("maps RLS / permission errors", () => {
    expect(toStaffErrorMessage(new Error("row-level security policy"))).toBe(
      "You do not have permission to do that.",
    );
  });

  it("keeps short product messages", () => {
    expect(toStaffErrorMessage(new Error("Plant not found."))).toBe("Plant not found.");
  });

  it("hides long PostgREST dumps", () => {
    expect(
      toStaffErrorMessage(
        new Error(
          "column plants.foo does not exist — " + "x".repeat(200),
        ),
      ),
    ).toBe("Something went wrong. Try again.");
  });
});
