"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PlantPotGuide } from "@/components/check-in/plant-pot-guide";
import { Button } from "@/components/ui/button";
import { acquireSharedCameraStream } from "@/lib/photos/shared-camera-stream";
import { cn } from "@/lib/utils";

type PlantCameraViewfinderProps = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
};

export function PlantCameraViewfinder({ open, onClose, onCapture }: PlantCameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function startCamera() {
      setReady(false);
      setError(null);

      try {
        const stream = await acquireSharedCameraStream();
        if (cancelled) return;

        const video = videoRef.current;
        if (!video) {
          setError("Could not open the camera. Try again.");
          return;
        }
        video.srcObject = stream;
        await video.play();
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          setError("Could not open the camera. Check permission, or use Library.");
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleCapture() {
    const video = videoRef.current;
    if (!video || !ready || capturing) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      setError("Camera is still starting. Try again in a moment.");
      return;
    }

    setCapturing(true);
    setError(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not capture frame");

      context.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), "image/jpeg", 0.92);
      });
      if (!blob) throw new Error("Could not capture frame");

      const file = new File([blob], `plant-${Date.now()}.jpg`, { type: "image/jpeg" });
      // Close the viewfinder before JPEG compress / upload so staff aren't stuck on camera (HIL-110).
      onClose();
      void Promise.resolve(onCapture(file)).catch((captureError: unknown) => {
        const message =
          captureError instanceof Error ? captureError.message : "Could not capture photo";
        setError(message);
      });
    } catch (captureError) {
      const message =
        captureError instanceof Error ? captureError.message : "Could not capture photo";
      setError(message);
    } finally {
      setCapturing(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex h-[100dvh] flex-col bg-hilda-heading"
      role="dialog"
      aria-modal="true"
      aria-label="Take plant photo"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className={cn(
            "h-full w-full object-cover",
            !ready && "opacity-0",
          )}
          playsInline
          muted
          autoPlay
        />

        {!ready && !error ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-hilda-inverse/80">
            Starting camera…
          </div>
        ) : null}

        {ready ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-[min(4%,1.5rem)] pt-[18%] landscape:pb-[min(2%,0.75rem)] landscape:pt-[8%]">
              <PlantPotGuide className="h-auto w-[min(54%,16.5rem)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] landscape:w-[min(28%,11rem)]" />
            </div>
            <p className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] px-4 text-center text-xs font-medium text-white/90 drop-shadow landscape:bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] landscape:text-[11px]">
              Align the pot with the outline
            </p>
          </>
        ) : null}
      </div>

      <div className="shrink-0 space-y-3 bg-hilda-heading/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {error ? <p className="text-center text-sm text-hilda-coral">{error}</p> : null}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-12 flex-1 border-white/30 bg-transparent text-hilda-inverse hover:bg-white/10"
            onClick={onClose}
            disabled={capturing}
          >
            Close
          </Button>
          <Button
            type="button"
            className="min-h-12 flex-1"
            onClick={() => void handleCapture()}
            disabled={!ready || capturing || Boolean(error && !ready)}
          >
            {capturing ? "Saving…" : "Take photo"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
