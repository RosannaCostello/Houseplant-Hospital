"use client";

import { useId, useState } from "react";
import { createPortal } from "react-dom";

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7.25V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function InfoDefinitionButton({
  label,
  definition,
}: {
  label: string;
  definition: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-hilda-text-muted transition-colors hover:bg-hilda-bg hover:text-hilda-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hilda-gold"
        aria-label={`About ${label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-hilda-heading/50"
                aria-label="Close"
                onClick={() => setOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="relative z-10 w-full max-w-sm rounded-hilda border border-hilda-border/15 bg-hilda-surface shadow-xl"
              >
                <div className="flex items-start justify-between gap-3 border-b border-hilda-border/10 px-4 py-3">
                  <h2 id={titleId} className="font-serif text-lg text-hilda-heading">
                    {label}
                  </h2>
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-hilda-heading hover:bg-hilda-bg"
                    aria-label="Close"
                    onClick={() => setOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <p id={descriptionId} className="px-4 py-4 text-sm leading-relaxed text-hilda-text">
                  {definition}
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
