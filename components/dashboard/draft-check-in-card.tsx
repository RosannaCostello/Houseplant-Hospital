"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { deleteCheckInDraft } from "@/app/actions/check-in-draft";
import {
  checkInDraftResumePath,
  checkInDraftStepLabel,
  type IncompleteCheckInDraft,
} from "@/lib/check-in/check-in-draft-types";
import { cn } from "@/lib/utils";

type DraftCheckInCardProps = {
  draft: IncompleteCheckInDraft;
  className?: string;
};

export function DraftCheckInCard({ draft, className }: DraftCheckInCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogTitleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const resumeHref = checkInDraftResumePath(draft.id, draft.draftStep);
  const plantLabel =
    draft.plantCount === 0
      ? "No plants yet"
      : draft.plantCount === 1
        ? "1 plant"
        : `${draft.plantCount} plants`;

  useEffect(() => {
    if (!open) return;

    const triggerElement = triggerRef.current;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      triggerElement?.focus();
    };
  }, [open]);

  function onDiscard() {

    if (!window.confirm("Discard this incomplete check-in? This cannot be undone.")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteCheckInDraft(draft.id);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className={cn("relative rounded-hilda hilda-card-shadow", className)}>
      <article className="flex w-full flex-col overflow-hidden rounded-hilda bg-hilda-surface">
        <div className="relative aspect-[3/1] w-full shrink-0 overflow-hidden bg-hilda-bg">
          {draft.thumbnailUrl ? (
            <Image
              src={draft.thumbnailUrl}
              alt=""
              fill
              sizes="18rem"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">
              Incomplete
            </div>
          )}
          {draft.fromAcuity ? (
            <span className="absolute left-2 top-1.5 inline-flex h-5 items-center rounded-hilda-sm bg-hilda-heading px-1.5 text-[10px] font-semibold uppercase tracking-wide text-hilda-gold shadow-sm">
              Acuity booking
            </span>
          ) : null}
        </div>

        <div className="space-y-1 p-2.5">
          <p className="truncate text-sm font-medium text-hilda-heading">{draft.customerName}</p>
          <p className="text-[11px] text-hilda-text">{checkInDraftStepLabel(draft.draftStep)}</p>
          <p className="text-[11px] text-hilda-text-muted">{plantLabel}</p>
          {error ? <p className="text-[11px] text-hilda-error-text">{error}</p> : null}
        </div>
      </article>

      <button
        ref={triggerRef}
        type="button"
        className="absolute inset-0 z-20 rounded-hilda transition-colors hover:bg-hilda-heading/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hilda-gold disabled:opacity-50"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Open incomplete check-in actions for ${draft.customerName}`}
        disabled={isPending}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <span className="sr-only">Open incomplete check-in actions</span>
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="absolute inset-0 bg-hilda-heading/40"
                aria-label="Close incomplete check-in actions"
                onClick={() => {
                  if (!isPending) setOpen(false);
                }}
              />

              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={dialogTitleId}
                className="relative z-10 w-full max-w-sm overflow-hidden rounded-hilda border border-hilda-border/15 bg-hilda-surface shadow-xl"
              >
                <div className="flex items-center justify-between gap-3 border-b border-hilda-border/10 px-4 py-3">
                  <div>
                    <h2 id={dialogTitleId} className="font-serif text-lg font-normal text-hilda-heading">
                      Incomplete check-in
                    </h2>
                    <p className="mt-1 text-sm text-hilda-text">{draft.customerName}</p>
                  </div>
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-hilda-heading hover:bg-hilda-bg disabled:opacity-50"
                    aria-label="Close"
                    disabled={isPending}
                    onClick={() => setOpen(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-2 p-4">
                  <Link
                    href={resumeHref}
                    className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-bugs bg-hilda-bugs px-4 py-2.5 text-sm font-semibold text-hilda-inverse hover:brightness-95"
                    onClick={() => setOpen(false)}
                  >
                    Complete check-in
                  </Link>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-error-border bg-hilda-error-bg px-4 py-2.5 text-sm font-semibold text-hilda-error-text hover:brightness-95 disabled:opacity-50"
                    disabled={isPending}
                    onClick={onDiscard}
                  >
                    {isPending ? "Discarding…" : "Discard"}
                  </button>
                  {error ? <p className="text-sm text-hilda-error-text">{error}</p> : null}
                </div>

                <div className="border-t border-hilda-border/10 px-4 py-3">
                  <button
                    type="button"
                    className="w-full rounded-hilda-sm border border-hilda-border/20 bg-hilda-bg px-3 py-2 text-sm font-medium text-hilda-heading transition-colors hover:bg-hilda-surface disabled:opacity-50"
                    disabled={isPending}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
