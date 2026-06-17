"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CheckInPlantPhoto } from "@/lib/check-in/photo-schema";
import { compressImageFile, formatImageByteSize } from "@/lib/photos/compress-image";
import { cn } from "@/lib/utils";

type PlantPhotoCaptureProps = {
  label: string;
  photo?: CheckInPlantPhoto;
  onPhotoChange: (photo: CheckInPlantPhoto | null) => void;
};

export function PlantPhotoCapture({ label, photo, onPhotoChange }: PlantPhotoCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-900">{label}</h2>
        {photo ? (
          <button
            type="button"
            className="text-sm font-medium text-red-600 hover:text-red-700"
            onClick={() => onPhotoChange(null)}
            disabled={processing}
          >
            Remove
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-4 overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50",
          photo ? "border-solid border-zinc-200" : "",
        )}
      >
        {photo ? (
          <div className="relative aspect-[4/3] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview of client-compressed data URL */}
            <img src={photo.dataUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-zinc-500">
            <span>Photo required</span>
            <span className="text-xs">Use the rear camera on iPad or choose an existing image</span>
          </div>
        )}
      </div>

      {photo ? (
        <p className="mt-2 text-xs text-zinc-500">
          {formatImageByteSize(photo.byteSize)} · {photo.mimeType === "image/webp" ? "WebP" : "JPEG"} ·{" "}
          {photo.width}×{photo.height}
          {photo.byteSize > 500 * 1024 ? " · above 500KB target" : ""}
        </p>
      ) : null}

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
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

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          disabled={processing}
          onClick={() => cameraInputRef.current?.click()}
        >
          {processing ? "Processing…" : photo ? "Retake photo" : "Take photo"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full sm:w-auto"
          disabled={processing}
          onClick={() => libraryInputRef.current?.click()}
        >
          Choose from library
        </Button>
      </div>
    </section>
  );
}
