"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createCheckInRecords, rollbackCheckIn } from "@/app/actions/complete-check-in";
import { CheckInStepHeader } from "@/components/check-in/check-in-step-header";
import { CheckInStepShell } from "@/components/check-in/check-in-step-shell";
import { PlantPhotoCapture } from "@/components/check-in/plant-photo-capture";
import { PlantStepPager } from "@/components/check-in/plant-step-pager";
import { Button } from "@/components/ui/button";
import { saveCheckInDraft, clearCheckInDraft } from "@/lib/check-in/draft";
import { checkInPlantLabel, type CheckInPlantPhoto } from "@/lib/check-in/photo-schema";
import { useCheckInDraft } from "@/lib/check-in/use-check-in-draft";
import { removePlantPhotoFiles, uploadPlantPhoto } from "@/lib/photos/upload-plant-photo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function photosByPlantId(photos: CheckInPlantPhoto[] | undefined): Map<string, CheckInPlantPhoto> {
  return new Map((photos ?? []).map((photo) => [photo.plantClientId, photo]));
}

function nextPlantIndexWithoutPhoto(
  plants: { clientId: string }[],
  photos: Map<string, CheckInPlantPhoto>,
  afterIndex: number,
): number | null {
  for (let index = afterIndex + 1; index < plants.length; index += 1) {
    if (!photos.has(plants[index].clientId)) {
      return index;
    }
  }

  return null;
}

export function PhotosStepForm() {
  const router = useRouter();
  const draft = useCheckInDraft();
  const customer = draft?.customer;
  const plants = draft?.plants ?? [];

  const draftPhotoMap = useMemo(() => photosByPlantId(draft?.photos), [draft?.photos]);
  const [editedPhotos, setEditedPhotos] = useState<Map<string, CheckInPlantPhoto> | null>(null);
  const [activePlantIndex, setActivePlantIndex] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const displayPhotos = editedPhotos ?? draftPhotoMap;

  useEffect(() => {
    if (submitting || displayPhotos.size === 0) {
      return;
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [displayPhotos.size, submitting]);

  if (!customer) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-hilda-heading">Check-in</h1>
        <p className="text-hilda-text">Start with customer details before adding photos.</p>
        <Button asChild size="lg">
          <Link href="/app/check-in">Go to customer step</Link>
        </Button>
      </div>
    );
  }

  if (plants.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-hilda-heading">Check-in</h1>
        <p className="text-hilda-text">Add at least one plant before continuing to photos.</p>
        <Button asChild size="lg">
          <Link href="/app/check-in/plants">Go to plants step</Link>
        </Button>
      </div>
    );
  }

  const activePlant = plants[Math.min(activePlantIndex, plants.length - 1)];

  function persistPhotos(next: Map<string, CheckInPlantPhoto>) {
    if (!customer) return;

    saveCheckInDraft({
      customer,
      plants,
      photos: Array.from(next.values()),
    });
  }

  function updatePhoto(plantClientId: string, photo: CheckInPlantPhoto | null, plantIndex: number) {
    setFormError(null);

    setEditedPhotos((current) => {
      const next = new Map(current ?? draftPhotoMap);

      if (photo) {
        next.set(plantClientId, { ...photo, plantClientId });
      } else {
        next.delete(plantClientId);
      }

      persistPhotos(next);

      if (photo) {
        const nextIndex = nextPlantIndexWithoutPhoto(plants, next, plantIndex);
        if (nextIndex !== null) {
          setActivePlantIndex(nextIndex);
        }
      }

      return next;
    });
  }

  async function onComplete(event: React.FormEvent) {
    event.preventDefault();
    if (!customer) return;

    const missing = plants.filter((plant) => !displayPhotos.has(plant.clientId));

    if (missing.length > 0) {
      const firstMissing = plants.findIndex((plant) => !displayPhotos.has(plant.clientId));
      if (firstMissing >= 0) {
        setActivePlantIndex(firstMissing);
      }

      setFormError(`Add a photo for each plant (${missing.length} remaining).`);
      return;
    }

    const stalePhotos = plants.filter((plant) => {
      const photo = displayPhotos.get(plant.clientId);
      return photo && !photo.thumbnailDataUrl;
    });

    if (stalePhotos.length > 0) {
      setFormError("Some photos need to be retaken (saved before thumbnails were added).");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSubmitStatus("Saving customer and plants…");

    let visitId: string | null = null;
    const uploadedPaths: string[] = [];
    let succeeded = false;

    try {
      const records = await createCheckInRecords({ customer, plants });

      if (!records.success) {
        setFormError(records.error);
        return;
      }

      visitId = records.visitId;
      const plantIdByClientId = new Map(records.plants.map((row) => [row.clientId, row.plantId]));

      const supabase = createSupabaseBrowserClient();
      for (let index = 0; index < plants.length; index += 1) {
        const plant = plants[index];
        const photo = displayPhotos.get(plant.clientId)!;
        const plantId = plantIdByClientId.get(plant.clientId);

        if (!plantId) {
          throw new Error("Could not match plant to photo.");
        }

        setSubmitStatus(`Uploading photo ${index + 1} of ${plants.length}…`);

        const uploaded = await uploadPlantPhoto(supabase, {
          plantId,
          mimeType: photo.mimeType,
          dataUrl: photo.dataUrl,
          thumbnailDataUrl: photo.thumbnailDataUrl,
        });
        uploadedPaths.push(uploaded.storagePath, uploaded.thumbnailPath);
      }

      clearCheckInDraft();
      setSubmitStatus("Done! Opening dashboard…");
      succeeded = true;
      router.push("/app");
      router.refresh();
    } catch (error) {
      if (uploadedPaths.length > 0) {
        const supabase = createSupabaseBrowserClient();
        await removePlantPhotoFiles(supabase, uploadedPaths);
      }

      if (visitId) {
        await rollbackCheckIn(visitId);
      }

      const message = error instanceof Error ? error.message : "Check-in failed";
      setFormError(message);
    } finally {
      setSubmitting(false);
      if (succeeded) {
        setSubmitStatus(null);
      }
    }
  }

  const buttonLabel = submitStatus ?? (submitting ? "Working…" : "Complete check-in");

  return (
    <CheckInStepShell
      maxWidth="3xl"
      header={
        <CheckInStepHeader
          step={3}
          totalSteps={3}
          title="Photos"
          description="One photo per plant. Images are compressed before upload."
        />
      }
      status={
        <>
          {displayPhotos.size > 0 && !submitting ? (
            <p className="text-xs text-hilda-text-muted">
              Photos are saved in this browser tab only — closing the tab or refreshing loses them.
              Complete check-in to save permanently.
            </p>
          ) : null}
          {formError ? <p className="text-sm text-hilda-error-text">{formError}</p> : null}
          {submitStatus ? <p className="text-sm text-hilda-text">{submitStatus}</p> : null}
        </>
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline" className="w-full sm:w-auto" disabled={submitting}>
            <Link href="/app/check-in/plants">Back to plants</Link>
          </Button>
          <Button type="submit" form="check-in-photos-form" className="w-full sm:w-auto" disabled={submitting}>
            {buttonLabel}
          </Button>
        </div>
      }
    >
      <form
        id="check-in-photos-form"
        className="flex min-h-0 flex-1 flex-col gap-3"
        onSubmit={onComplete}
        noValidate
      >
        <PlantStepPager
          total={plants.length}
          currentIndex={activePlantIndex}
          onIndexChange={setActivePlantIndex}
          isComplete={(index) => displayPhotos.has(plants[index].clientId)}
        />

        <PlantPhotoCapture
          key={activePlant.clientId}
          label={checkInPlantLabel(activePlant, activePlantIndex)}
          photo={displayPhotos.get(activePlant.clientId)}
          onPhotoChange={(photo) => updatePhoto(activePlant.clientId, photo, activePlantIndex)}
        />
      </form>
    </CheckInStepShell>
  );
}
