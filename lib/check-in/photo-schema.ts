import type { CheckInPlant } from "@/lib/check-in/plant-schema";

/** Compressed check-in photo stored in session draft until upload on completion. */
export type CheckInPlantPhoto = {
  plantClientId: string;
  mimeType: "image/webp" | "image/jpeg";
  dataUrl: string;
  byteSize: number;
  width: number;
  height: number;
  thumbnailDataUrl: string;
  thumbnailByteSize: number;
};

export function checkInPlantLabel(plant: CheckInPlant, index: number): string {
  const name = plant.name?.trim() || plant.species?.trim();

  if (name) {
    return `${name} · ${plant.size}`;
  }

  return `Plant ${index + 1} · ${plant.size}`;
}
