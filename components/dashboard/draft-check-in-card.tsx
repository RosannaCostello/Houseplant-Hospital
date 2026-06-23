"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  const [error, setError] = useState<string | null>(null);

  const resumeHref = checkInDraftResumePath(draft.id, draft.draftStep);
  const plantLabel =
    draft.plantCount === 0
      ? "No plants yet"
      : draft.plantCount === 1
        ? "1 plant"
        : `${draft.plantCount} plants`;

  function onDiscard(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

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

      router.refresh();
    });
  }

  return (
    <div className={cn("rounded-hilda hilda-card-shadow", className)}>
      <article className="flex w-full flex-col overflow-hidden rounded-hilda bg-hilda-surface">
        <Link href={resumeHref} className="block transition-colors hover:bg-hilda-bg">
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
          </div>

          <div className="space-y-1 p-2.5">
            <p className="truncate text-sm font-medium text-hilda-heading">{draft.customerName}</p>
            <p className="text-[11px] text-hilda-text">{checkInDraftStepLabel(draft.draftStep)}</p>
            <p className="text-[11px] text-hilda-text-muted">{plantLabel}</p>
            {error ? <p className="text-[11px] text-hilda-error-text">{error}</p> : null}
          </div>
        </Link>

        <div className="border-t border-hilda-border/10 px-2.5 pb-2.5 pt-1">
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-hilda-sm border border-hilda-border/15 bg-hilda-surface px-2.5 py-2 text-sm font-normal uppercase tracking-[0.08em] text-hilda-heading transition-colors hover:bg-hilda-bg disabled:opacity-50"
            disabled={isPending}
            onClick={onDiscard}
          >
            Discard
          </button>
        </div>
      </article>
    </div>
  );
}
