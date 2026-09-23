"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  deleteCheckInDraft,
  deleteCheckInDraftPhoto,
  finalizeCheckInDraft,
  updateCheckInDraftPlants,
  uploadCheckInDraftPhoto,
} from "@/app/actions/check-in-draft";
import { CheckInStepHeader } from "@/components/check-in/check-in-step-header";
import { CheckInStepShell } from "@/components/check-in/check-in-step-shell";
import { PlantPhotoCapture } from "@/components/check-in/plant-photo-capture";
import { SpeciesField } from "@/components/check-in/species-field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CheckInCustomer } from "@/lib/check-in/customer-schema";
import type { CheckInDraftPhotoView } from "@/lib/check-in/photo-schema";
import { checkInPlantLabel, type CheckInPlantPhoto } from "@/lib/check-in/photo-schema";
import type { CheckInPlant, CheckInPlantInput } from "@/lib/check-in/plant-schema";
import { checkInPlantsPhotosStepSchema } from "@/lib/check-in/plant-schema";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import { cn } from "@/lib/utils";

function normalizeDraftPlants(plants: CheckInPlantInput[]): CheckInPlant[] {
  return plants.map((plant) => ({
    ...plant,
    bugsFound: plant.bugsFound ?? null,
    potSizeChangeConsent: plant.potSizeChangeConsent ?? false,
  }));
}

function photosByPlantId(photos: CheckInDraftPhotoView[]): Map<string, CheckInDraftPhotoView> {
  return new Map(photos.map((photo) => [photo.plantClientId, photo]));
}

type PhotosStepFormProps = {
  draftId: string;
  customer: CheckInCustomer;
  plants: CheckInPlantInput[];
  initialPhotos: CheckInDraftPhotoView[];
};

export function PhotosStepForm({ draftId, customer, plants: initialPlants, initialPhotos }: PhotosStepFormProps) {
  const router = useRouter();
  const plantSectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const initialPhotoMap = useMemo(() => photosByPlantId(initialPhotos), [initialPhotos]);
  const [plants, setPlants] = useState<CheckInPlantInput[]>(initialPlants);
  const normalizedPlants = useMemo(() => normalizeDraftPlants(plants), [plants]);
  const [displayPhotos, setDisplayPhotos] = useState<Map<string, CheckInDraftPhotoView>>(initialPhotoMap);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [uploadingPlantId, setUploadingPlantId] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [plantErrors, setPlantErrors] = useState<Record<string, { notes?: string }>>({});

  function scrollToPlant(clientId: string) {
    requestAnimationFrame(() => {
      plantSectionRefs.current.get(clientId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function setPlantSectionRef(clientId: string, element: HTMLElement | null) {
    if (element) {
      plantSectionRefs.current.set(clientId, element);
    } else {
      plantSectionRefs.current.delete(clientId);
    }
  }

  async function updatePhoto(plantClientId: string, photo: CheckInPlantPhoto | null) {
    setFormError(null);

    if (!photo) {
      setUploadingPlantId(plantClientId);
      const result = await deleteCheckInDraftPhoto(draftId, plantClientId);
      setUploadingPlantId(null);

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      setDisplayPhotos((current) => {
        const next = new Map(current);
        next.delete(plantClientId);
        return next;
      });
      return;
    }

    setUploadingPlantId(plantClientId);
    const result = await uploadCheckInDraftPhoto({
      draftId,
      plantClientId,
      mimeType: photo.mimeType,
      dataUrl: photo.dataUrl,
      thumbnailDataUrl: photo.thumbnailDataUrl,
      byteSize: photo.byteSize,
      width: photo.width,
      height: photo.height,
    });
    setUploadingPlantId(null);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    const view: CheckInDraftPhotoView = {
      plantClientId,
      mimeType: photo.mimeType,
      previewUrl: photo.dataUrl,
      byteSize: photo.byteSize,
      width: photo.width,
      height: photo.height,
    };

    setDisplayPhotos((current) => {
      const next = new Map(current);
      next.set(plantClientId, view);
      return next;
    });
    // Local state is enough — avoid router.refresh() flicker after every upload (HIL-110).
  }

  function updatePlant(clientId: string, patch: Partial<CheckInPlantInput>) {
    setPlants((current) =>
      current.map((plant) => (plant.clientId === clientId ? { ...plant, ...patch } : plant)),
    );
    if ("notes" in patch) {
      setPlantErrors((current) => {
        if (!current[clientId]?.notes) return current;
        const next = { ...current };
        delete next[clientId];
        return next;
      });
    }
  }

  function collectPlantValidationErrors(): CheckInPlant[] | null {
    const parsed = checkInPlantsPhotosStepSchema.safeParse({ plants: normalizedPlants });

    if (!parsed.success) {
      const errors: Record<string, { notes?: string }> = {};
      let firstErrorClientId: string | null = null;

      for (const issue of parsed.error.issues) {
        const index = issue.path[0];
        const field = issue.path[1];

        if (typeof index === "number" && field === "notes") {
          const plant = normalizedPlants[index];
          if (!plant) continue;

          if (firstErrorClientId === null) {
            firstErrorClientId = plant.clientId;
          }

          errors[plant.clientId] ??= {};
          if (!errors[plant.clientId].notes) {
            errors[plant.clientId].notes = issue.message;
          }
        }
      }

      if (firstErrorClientId) {
        scrollToPlant(firstErrorClientId);
      }

      setPlantErrors(errors);
      setFormError(
        Object.keys(errors).length > 0
          ? "Add internal notes (at least 12 characters) for each plant."
          : "Check the highlighted fields and try again.",
      );
      return null;
    }

    setPlantErrors({});
    return parsed.data.plants;
  }

  async function onComplete(event: React.FormEvent) {
    event.preventDefault();

    const validPlants = collectPlantValidationErrors();
    if (!validPlants) return;

    const missing = validPlants.filter((plant) => !displayPhotos.has(plant.clientId));

    if (missing.length > 0) {
      const firstMissingPlant = missing[0];
      if (firstMissingPlant) {
        scrollToPlant(firstMissingPlant.clientId);
      }

      setFormError(`Add a photo for each plant (${missing.length} remaining).`);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSubmitStatus("Saving plant details…");

    const savePlants = await updateCheckInDraftPlants(draftId, validPlants);
    if (!savePlants.success) {
      setSubmitting(false);
      setSubmitStatus(null);
      setFormError(savePlants.error);
      return;
    }

    setSubmitStatus("Completing check-in…");

    const result = await finalizeCheckInDraft(draftId);

    setSubmitting(false);

    if (!result.success) {
      setSubmitStatus(null);
      setFormError(result.error);
      return;
    }

    setSubmitStatus("Done! Opening dashboard…");
    router.push("/app");
    router.refresh();
  }

  async function runDiscard() {
    setSubmitting(true);
    const result = await deleteCheckInDraft(draftId);
    setSubmitting(false);
    setConfirmDiscard(false);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  function onDiscard() {
    setConfirmDiscard(true);
  }

  const buttonLabel = submitStatus ?? (submitting ? "Working…" : "Complete check-in");
  const customerFullName = `${customer.firstName} ${customer.lastName}`;
  const photosStepTitle = `Photos of ${customerFullName}'s ${normalizedPlants.length === 1 ? "plant" : "plants"}`;

  return (
    <CheckInStepShell
      maxWidth="3xl"
      header={
        <CheckInStepHeader
          step={3}
          totalSteps={3}
          title={photosStepTitle}
        />
      }
      status={
        <>
          <p className="text-xs text-hilda-text-muted">
            Photos are saved to this draft check-in. You can leave and resume from the dashboard at any time.
          </p>
          {formError ? <p className="text-sm text-hilda-error-text">{formError}</p> : null}
          {submitStatus ? <p className="text-sm text-hilda-text">{submitStatus}</p> : null}
        </>
      }
      footer={
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            form="check-in-photos-form"
            className="w-full"
            size="lg"
            disabled={submitting}
          >
            {buttonLabel}
          </Button>
          <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-4">
            <Button asChild variant="ghost" className="hh-check-in-discard w-full text-hilda-text-muted sm:w-auto">
              <Link href={`/app/check-in/plants?draft=${draftId}`}>Back to plants</Link>
            </Button>
            <button
              type="button"
              className="hh-check-in-discard min-h-11 px-3 text-sm font-medium text-hilda-text-muted underline-offset-2 hover:text-hilda-heading hover:underline disabled:opacity-50"
              disabled={submitting}
              onClick={() => void onDiscard()}
            >
              Discard draft
            </button>
          </div>
        </div>
      }
    >
      <form
        id="check-in-photos-form"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
        onSubmit={(event) => void onComplete(event)}
        noValidate
      >
        <div className="flex flex-col gap-3">
          {normalizedPlants.map((plant, index) => (
            <div
              key={plant.clientId}
              ref={(element) => setPlantSectionRef(plant.clientId, element)}
              className="shrink-0 space-y-3 rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3"
            >
              <h2 className="text-lg font-semibold text-hilda-heading">
                {checkInPlantLabel(plant, index)}
              </h2>

              <SpeciesField
                value={plant.species}
                onChange={(species) => updatePlant(plant.clientId, { species })}
              />

              <label className={hildaLabelClassName}>
                Internal notes
                <textarea
                  className={cn(hildaInputClassName, "min-h-[4.5rem] resize-none py-2.5")}
                  rows={2}
                  value={plant.notes}
                  onChange={(event) => updatePlant(plant.clientId, { notes: event.target.value })}
                  placeholder="Visible issues, pot size, customer concerns…"
                  aria-invalid={Boolean(plantErrors[plant.clientId]?.notes)}
                />
                {plantErrors[plant.clientId]?.notes ? (
                  <span className="mt-1 block text-sm text-hilda-error-text">
                    {plantErrors[plant.clientId]?.notes}
                  </span>
                ) : null}
              </label>

              <PlantPhotoCapture
                label={`Photo — ${checkInPlantLabel(plant, index)}`}
                photo={displayPhotos.get(plant.clientId)}
                uploading={uploadingPlantId === plant.clientId}
                className="flex-none"
                onPhotoChange={(photo) => void updatePhoto(plant.clientId, photo)}
              />
            </div>
          ))}
        </div>
      </form>
      <ConfirmDialog
        open={confirmDiscard}
        title="Discard check-in?"
        message="Discard this incomplete check-in? This cannot be undone."
        confirmLabel="Discard"
        destructive
        pending={submitting}
        onConfirm={() => {
          void runDiscard();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </CheckInStepShell>
  );
}
