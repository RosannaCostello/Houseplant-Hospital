import type { CheckInCustomer } from "@/lib/check-in/customer-schema";
import type { CheckInPlant } from "@/lib/check-in/plant-schema";

export const CHECK_IN_DRAFT_STEPS = ["plants", "photos"] as const;
export type CheckInDraftStep = (typeof CHECK_IN_DRAFT_STEPS)[number];

export type CheckInDraftPhotoRecord = {
  plantClientId: string;
  mimeType: "image/webp" | "image/jpeg";
  thumbnailUrl: string;
  previewUrl: string;
  byteSize: number;
  width: number;
  height: number;
};

export type CheckInDraftDetail = {
  id: string;
  customerId: string;
  customer: CheckInCustomer;
  plants: CheckInPlant[];
  draftStep: CheckInDraftStep;
  createdAt: string;
  updatedAt: string;
  photos: CheckInDraftPhotoRecord[];
};

export type IncompleteCheckInDraft = {
  id: string;
  customerName: string;
  draftStep: CheckInDraftStep;
  plantCount: number;
  updatedAt: string;
  thumbnailUrl: string | null;
  /** Present when draft was created from an Acuity booking webhook. */
  fromAcuity: boolean;
};

export function checkInDraftResumePath(draftId: string, draftStep: CheckInDraftStep): string {
  return draftStep === "photos"
    ? `/app/check-in/photos?draft=${draftId}`
    : `/app/check-in/plants?draft=${draftId}`;
}

export function checkInDraftStepLabel(draftStep: CheckInDraftStep): string {
  return draftStep === "photos" ? "Step 3 of 3 — Photos" : "Step 2 of 3 — Plants";
}
