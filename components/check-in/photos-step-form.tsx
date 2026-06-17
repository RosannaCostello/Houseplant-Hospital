"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckInStepHeader } from "@/components/check-in/check-in-step-header";
import { PlantPhotoCapture } from "@/components/check-in/plant-photo-capture";
import { Button } from "@/components/ui/button";
import {
  createCheckInRecordsWithClient,
  rollbackCheckInWithClient,
} from "@/lib/check-in/create-check-in-records";
import { clearCheckInDraft } from "@/lib/check-in/draft";
import { checkInPlantLabel, type CheckInPlantPhoto } from "@/lib/check-in/photo-schema";
import { useCheckInDraft } from "@/lib/check-in/use-check-in-draft";
import { uploadPlantPhoto } from "@/lib/photos/upload-plant-photo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function photosByPlantId(photos: CheckInPlantPhoto[] | undefined): Map<string, CheckInPlantPhoto> {
  return new Map((photos ?? []).map((photo) => [photo.plantClientId, photo]));
}

export function PhotosStepForm() {
  const router = useRouter();
  const draft = useCheckInDraft();
  const customer = draft?.customer;
  const plants = draft?.plants ?? [];

  const draftPhotoMap = useMemo(() => photosByPlantId(draft?.photos), [draft?.photos]);
  const [editedPhotos, setEditedPhotos] = useState<Map<string, CheckInPlantPhoto> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const displayPhotos = editedPhotos ?? draftPhotoMap;

  if (!customer) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Check-in</h1>
        <p className="text-zinc-600">Start with customer details before adding photos.</p>
        <Button asChild size="lg">
          <Link href="/app/check-in">Go to customer step</Link>
        </Button>
      </div>
    );
  }

  if (plants.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Check-in</h1>
        <p className="text-zinc-600">Add at least one plant before continuing to photos.</p>
        <Button asChild size="lg">
          <Link href="/app/check-in/plants">Go to plants step</Link>
        </Button>
      </div>
    );
  }

  function updatePhoto(plantClientId: string, photo: CheckInPlantPhoto | null) {
    setFormError(null);

    setEditedPhotos((current) => {
      const next = new Map(current ?? draftPhotoMap);

      if (photo) {
        next.set(plantClientId, { ...photo, plantClientId });
      } else {
        next.delete(plantClientId);
      }

      return next;
    });
  }

  async function onComplete(event: React.FormEvent) {
    event.preventDefault();
    if (!customer) return;

    const missing = plants.filter((plant) => !displayPhotos.has(plant.clientId));

    if (missing.length > 0) {
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

    const supabase = createSupabaseBrowserClient();
    let visitId: string | null = null;
    let succeeded = false;

    try {
      const records = await createCheckInRecordsWithClient(supabase, { customer, plants });

      if (!records.success) {
        setFormError(records.error);
        return;
      }

      visitId = records.visitId;
      const plantIdByClientId = new Map(records.plants.map((row) => [row.clientId, row.plantId]));

      for (let index = 0; index < plants.length; index += 1) {
        const plant = plants[index];
        const photo = displayPhotos.get(plant.clientId)!;
        const plantId = plantIdByClientId.get(plant.clientId);

        if (!plantId) {
          throw new Error("Could not match plant to photo.");
        }

        setSubmitStatus(`Uploading photo ${index + 1} of ${plants.length}…`);

        await uploadPlantPhoto(supabase, {
          plantId,
          mimeType: photo.mimeType,
          dataUrl: photo.dataUrl,
          thumbnailDataUrl: photo.thumbnailDataUrl,
        });
      }

      clearCheckInDraft();
      setSubmitStatus("Done! Opening dashboard…");
      succeeded = true;
      router.push("/app");
      router.refresh();
    } catch (error) {
      if (visitId) {
        await rollbackCheckInWithClient(supabase, visitId);
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
    <div className="mx-auto w-full max-w-3xl">
      <CheckInStepHeader
        step={3}
        totalSteps={3}
        title="Photos"
        description="Take one photo per plant. Images are compressed and stripped of location metadata before upload."
      />

      <form className="mt-8 space-y-6" onSubmit={onComplete} noValidate>
        <div className="space-y-4">
          {plants.map((plant, index) => (
            <PlantPhotoCapture
              key={plant.clientId}
              label={checkInPlantLabel(plant, index)}
              photo={displayPhotos.get(plant.clientId)}
              onPhotoChange={(photo) => updatePhoto(plant.clientId, photo)}
            />
          ))}
        </div>

        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
        {submitStatus ? <p className="text-sm text-zinc-600">{submitStatus}</p> : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto" disabled={submitting}>
            <Link href="/app/check-in/plants">Back to plants</Link>
          </Button>
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
            {buttonLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
