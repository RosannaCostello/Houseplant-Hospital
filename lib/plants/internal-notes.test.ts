import { describe, expect, it } from "vitest";
import {
  isVisitImportMarker,
  plantCheckInLabel,
  resolvePlantInternalNotes,
} from "@/lib/plants/internal-notes";

describe("resolvePlantInternalNotes", () => {
  it("prefers plant notes", () => {
    expect(
      resolvePlantInternalNotes({
        plantNotes: "only mine",
        visitNotes: "Plant 1: other\nPlant 2: skip",
        name: null,
        species: null,
        visitPlantIndex: 1,
        visitPlantTotal: 2,
      }),
    ).toBe("only mine");
  });

  it("copies visit notes for single-plant drop-offs", () => {
    expect(
      resolvePlantInternalNotes({
        plantNotes: null,
        visitNotes: "water weekly",
        name: "Fern",
        species: null,
        visitPlantIndex: 1,
        visitPlantTotal: 1,
      }),
    ).toBe("water weekly");
  });

  it("extracts the matching line from combined visit notes", () => {
    expect(
      resolvePlantInternalNotes({
        plantNotes: null,
        visitNotes: "Fern: thirsty\nMonstera: dusty",
        name: "Monstera",
        species: null,
        visitPlantIndex: 2,
        visitPlantTotal: 2,
      }),
    ).toBe("dusty");
  });

  it("ignores import markers", () => {
    expect(
      resolvePlantInternalNotes({
        plantNotes: null,
        visitNotes: "zoho-import",
        name: null,
        species: null,
        visitPlantIndex: 1,
        visitPlantTotal: 1,
      }),
    ).toBeNull();
    expect(isVisitImportMarker("shopify-import")).toBe(true);
  });

  it("labels unnamed plants by index", () => {
    expect(plantCheckInLabel({ name: null, species: null }, 3)).toBe("Plant 3");
  });
});
