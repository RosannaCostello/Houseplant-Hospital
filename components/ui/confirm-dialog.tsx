"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { lockBodyScroll } from "@/lib/ui/body-scroll-lock";
import { STAFF_OVERLAY_Z } from "@/lib/ui/overlay-z";
import { cn } from "@/lib/utils";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive confirm styling (discard / irreversible). */
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // Prefer Cancel on open so destructive Confirm is not a mis-tap target (HIL-110).
    cancelRef.current?.focus();
    const unlock = lockBodyScroll();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlock();
    };
  }, [open, pending, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("fixed inset-0 flex items-center justify-center p-4", STAFF_OVERLAY_Z)}>
      <button
        type="button"
        className="absolute inset-0 bg-hilda-heading/40"
        aria-label="Dismiss confirmation"
        disabled={pending}
        onClick={() => {
          if (!pending) onCancel();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-hilda border border-hilda-border/15 bg-hilda-surface shadow-xl"
      >
        <div className="border-b border-hilda-border/10 px-4 py-3">
          <h2 id={titleId} className="font-serif text-lg font-normal text-hilda-heading">
            {title}
          </h2>
          <p id={descriptionId} className="mt-2 text-sm text-hilda-text">
            {message}
          </p>
        </div>

        <div className="flex flex-col gap-2 p-4">
          {destructive ? (
            <>
              <Button
                ref={cancelRef}
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                disabled={pending}
                onClick={onCancel}
              >
                {cancelLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "min-h-11 w-full border-hilda-error-border bg-hilda-error-bg text-hilda-error-text hover:brightness-95",
                )}
                disabled={pending}
                onClick={onConfirm}
              >
                {pending ? "Working…" : confirmLabel}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="default"
                className="min-h-11 w-full"
                disabled={pending}
                onClick={onConfirm}
              >
                {pending ? "Working…" : confirmLabel}
              </Button>
              <Button
                ref={cancelRef}
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                disabled={pending}
                onClick={onCancel}
              >
                {cancelLabel}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
