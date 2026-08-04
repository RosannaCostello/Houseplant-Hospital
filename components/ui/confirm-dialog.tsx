"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
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
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, pending, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
          <Button
            ref={confirmRef}
            type="button"
            variant={destructive ? "outline" : "default"}
            className={cn(
              "min-h-11 w-full",
              destructive &&
                "border-hilda-error-border bg-hilda-error-bg text-hilda-error-text hover:brightness-95",
            )}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            disabled={pending}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
