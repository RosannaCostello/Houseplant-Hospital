"use client";

import { useEffect, useRef, useState } from "react";
import { PlantCameraViewfinder } from "@/components/check-in/plant-camera-viewfinder";
import { Button } from "@/components/ui/button";
import type { CheckInDraftPhotoView, CheckInPlantPhoto } from "@/lib/check-in/photo-schema";
import { photoPreviewSrc } from "@/lib/check-in/photo-schema";
import { compressImageFile, formatImageByteSize } from "@/lib/photos/compress-image";
import {
  releaseSharedCameraStream,
  retainSharedCameraStream,
} from "@/lib/photos/shared-camera-stream";
import { cn } from "@/lib/utils";

type PlantPhotoCaptureProps = {
  label: string;
  photo?: CheckInPlantPhoto | CheckInDraftPhotoView;
  onPhotoChange: (photo: CheckInPlantPhoto | null) => void;
  className?: string;
  uploading?: boolean;
};

export function PlantPhotoCapture({
  label,
  photo,
  onPhotoChange,
  className,
  uploading = false,
}: PlantPhotoCaptureProps) {
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    retainSharedCameraStream();
    return () => releaseSharedCameraStream();
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const compressed = await compressImageFile(file);

      onPhotoChange({
        plantClientId: photo?.plantClientId ?? "",
        mimeType: compressed.mimeType,
        dataUrl: compressed.dataUrl,
        byteSize: compressed.byteSize,
        width: compressed.width,
        height: compressed.height,
        thumbnailDataUrl: compressed.thumbnailDataUrl,
        thumbnailByteSize: compressed.thumbnailByteSize,
      });
    } catch (captureError) {
      const message =
        captureError instanceof Error ? captureError.message : "Could not process photo";
      setError(message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 sm:flex-row sm:items-stretch">
        <div
          className={cn(
            "relative min-h-0 w-full overflow-hidden rounded-hilda-sm border border-dashed border-hilda-border/25 bg-hilda-bg sm:w-[44%] sm:shrink-0",
            photo ? "border-solid border-hilda-border/15" : "",
          )}
        >
          {photo ? (
            <div className="aspect-[4/3] max-h-[min(36dvh,14rem)] w-full landscape:max-h-[min(48dvh,16rem)] sm:max-h-[min(40dvh,15rem)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview of captured or stored photo */}
              <img src={photoPreviewSrc(photo)} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex aspect-[4/3] max-h-[min(36dvh,14rem)] w-full flex-col items-center justify-center gap-1 px-3 text-center text-xs text-hilda-text-muted landscape:max-h-[min(48dvh,16rem)] sm:max-h-[min(40dvh,15rem)]">
              <span className="font-medium text-hilda-text">Photo required</span>
              <span>Camera guide or library</span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold leading-snug text-hilda-heading">{label}</h2>
            {photo ? (
              <button
                type="button"
                className="min-h-11 shrink-0 px-1 text-sm font-medium text-hilda-error-text hover:text-hilda-error-text-strong"
                onClick={() => onPhotoChange(null)}
                disabled={processing || uploading}
              >
                Remove
              </button>
            ) : null}
          </div>

          {photo ? (
            <p className="text-xs text-hilda-text-muted">
              {formatImageByteSize(photo.byteSize)} · {photo.mimeType === "image/webp" ? "WebP" : "JPEG"}{" "}
              · {photo.width}×{photo.height}
            </p>
          ) : null}

          {error ? <p className="text-sm text-hilda-error-text">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-11 flex-1 sm:flex-none"
              disabled={processing || uploading}
              onClick={() => setCameraOpen(true)}
            >
              {processing || uploading ? "Saving…" : photo ? "Retake" : "Take photo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1 sm:flex-none"
              disabled={processing || uploading}
              onClick={() => libraryInputRef.current?.click()}
            >
              Library
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <PlantCameraViewfinder
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => handleFile(file)}
      />
    </section>
  );
}
