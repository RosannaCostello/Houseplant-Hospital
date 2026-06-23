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

/** Server-persisted draft photo for display in the photos step. */
export type CheckInDraftPhotoView = {
  plantClientId: string;
  mimeType: "image/webp" | "image/jpeg";
  previewUrl: string;
  byteSize: number;
  width: number;
  height: number;
};

export function photoPreviewSrc(photo: CheckInPlantPhoto | CheckInDraftPhotoView): string {
  return "dataUrl" in photo ? photo.dataUrl : photo.previewUrl;
}

export function checkInPlantLabel(plant: CheckInPlant, index: number): string {
  const name = plant.name?.trim() || plant.species?.trim();

  if (name) {
    return `${name} · ${plant.size}`;
  }

  return `Plant ${index + 1} · ${plant.size}`;
}
