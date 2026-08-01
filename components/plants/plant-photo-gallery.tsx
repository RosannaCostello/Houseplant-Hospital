"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retakePlantPhotoAction } from "@/app/actions/retake-plant-photo";
import { PlantPhotoCapture } from "@/components/check-in/plant-photo-capture";
import { BugsFoundBadge } from "@/components/plants/bugs-found-badge";
import { PropagationBadge } from "@/components/plants/propagation-badge";
import { Button } from "@/components/ui/button";
import type { CheckInPlantPhoto } from "@/lib/check-in/photo-schema";
import type { PlantDetailPhoto } from "@/lib/plants/get-plant-detail";

type PlantPhotoGalleryProps = {
  plantId: string;
  photos: PlantDetailPhoto[];
  bugsFound: boolean | null;
  isPropagation: boolean;
  canRetake: boolean;
};

export function PlantPhotoGallery({
  plantId,
  photos,
  bugsFound,
  isPropagation,
  canRetake,
}: PlantPhotoGalleryProps) {
  const router = useRouter();
  const latestPhoto = photos[0] ?? null;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [retakeOpen, setRetakeOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<CheckInPlantPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (lightboxIndex === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxIndex(null);
        setRetakeOpen(false);
        setPendingPhoto(null);
        setError(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex]);

  function openLightbox(index: number) {
    setLightboxIndex(index);
    setRetakeOpen(false);
    setPendingPhoto(null);
    setError(null);
  }

  function closeLightbox() {
    setLightboxIndex(null);
    setRetakeOpen(false);
    setPendingPhoto(null);
    setError(null);
  }

  function saveRetake() {
    if (!pendingPhoto?.dataUrl || !pendingPhoto.thumbnailDataUrl) {
      setError("Capture a new photo before saving.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await retakePlantPhotoAction({
        plantId,
        mimeType: pendingPhoto.mimeType,
        dataUrl: pendingPhoto.dataUrl,
        thumbnailDataUrl: pendingPhoto.thumbnailDataUrl,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      closeLightbox();
      router.refresh();
    });
  }

  const lightboxPhoto = lightboxIndex != null ? (photos[lightboxIndex] ?? null) : null;
  const lightboxOpen = lightboxIndex !== null;

  return (
    <>
      <section className="flex flex-col overflow-hidden rounded-hilda border border-hilda-border/15 bg-hilda-surface">
        <button
          type="button"
          className="relative aspect-[4/3] w-full flex-1 bg-hilda-bg text-left sm:aspect-auto sm:min-h-[12.5rem]"
          onClick={() => {
            if (latestPhoto) openLightbox(0);
          }}
          disabled={!latestPhoto}
          aria-label={latestPhoto ? "View photo fullscreen" : undefined}
        >
          {latestPhoto ? (
            <Image
              src={latestPhoto.url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 20rem"
              className="object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-hilda-text-muted">
              No photo
            </div>
          )}
          {bugsFound ? <BugsFoundBadge className="absolute right-2 top-2 bg-hilda-bugs" /> : null}
          {isPropagation ? <PropagationBadge className="absolute left-2 top-2" /> : null}
        </button>

        {photos.length > 1 ? (
          <div className="flex gap-1.5 overflow-x-auto border-t border-hilda-border/10 p-2">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                className="relative h-12 w-14 shrink-0 overflow-hidden rounded-hilda-sm border border-hilda-border/15"
                onClick={() => openLightbox(index)}
                aria-label={`View photo ${index + 1} fullscreen`}
              >
                <Image
                  src={photo.thumbnailUrl ?? photo.url}
                  alt=""
                  fill
                  sizes="3.5rem"
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        ) : null}

        {canRetake ? (
          <div className="border-t border-hilda-border/10 p-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setLightboxIndex(0);
                setRetakeOpen(true);
                setPendingPhoto(null);
                setError(null);
              }}
            >
              {latestPhoto ? "Retake photo" : "Add photo"}
            </Button>
          </div>
        ) : null}
      </section>

      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Plant photo"
          onClick={closeLightbox}
        >
          <div className="flex items-center justify-between gap-2 text-white">
            <p className="text-sm">Plant photo</p>
            <Button
              type="button"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10"
              onClick={(event) => {
                event.stopPropagation();
                closeLightbox();
              }}
            >
              Close
            </Button>
          </div>

          {lightboxPhoto ? (
            <div
              className="relative mt-3 min-h-0 flex-1"
              onClick={(event) => event.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- fullscreen lightbox */}
              <img
                src={lightboxPhoto.url}
                alt=""
                className="mx-auto h-full max-h-[min(80dvh,40rem)] w-full object-contain"
              />
            </div>
          ) : (
            <div className="mt-3 flex min-h-0 flex-1 items-center justify-center text-sm text-white/70">
              No photo yet
            </div>
          )}

          {canRetake ? (
            <div
              className="mt-3 space-y-2 rounded-hilda border border-white/20 bg-black/40 p-3 text-white"
              onClick={(event) => event.stopPropagation()}
            >
              {!retakeOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/40 bg-transparent text-white hover:bg-white/10"
                  onClick={() => setRetakeOpen(true)}
                >
                  {lightboxPhoto ? "Retake photo" : "Add photo"}
                </Button>
              ) : (
                <>
                  <PlantPhotoCapture
                    label="New plant photo"
                    photo={pendingPhoto ?? undefined}
                    onPhotoChange={(photo) => {
                      setPendingPhoto(
                        photo
                          ? {
                              ...photo,
                              plantClientId: plantId,
                            }
                          : null,
                      );
                      setError(null);
                    }}
                    uploading={isPending}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 sm:w-auto"
                      disabled={isPending}
                      onClick={() => {
                        setRetakeOpen(false);
                        setPendingPhoto(null);
                        setError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      disabled={isPending || !pendingPhoto}
                      onClick={() => saveRetake()}
                    >
                      {isPending ? "Saving…" : "Save new photo"}
                    </Button>
                  </div>
                  {error ? <p className="text-sm text-red-300">{error}</p> : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
