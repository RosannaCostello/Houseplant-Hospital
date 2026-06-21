"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setBugsFoundAction } from "@/app/actions/set-bugs-found";
import { cn } from "@/lib/utils";

type BugsFoundToggleProps = {
  plantId: string;
  bugsFound: boolean | null;
  disabled?: boolean;
};

const OPTIONS = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
] as const;

export function BugsFoundToggle({
  plantId,
  bugsFound,
  disabled = false,
}: BugsFoundToggleProps) {
  const router = useRouter();
  const [selection, setSelection] = useState<boolean | null>(bugsFound);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelection(bugsFound);
  }, [bugsFound]);

  function handleSelect(next: boolean | null) {
    setError(null);

    startTransition(async () => {
      const result = await setBugsFoundAction(plantId, next);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSelection(result.bugsFound);
      router.refresh();
    });
  }

  const showClear = !disabled && selection !== null;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Bugs found during treatment?
      </h2>

      {!disabled ? (
        <>
          <div
            className="flex flex-wrap items-stretch gap-2"
            role="radiogroup"
            aria-label="Bugs found during treatment"
          >
            {OPTIONS.map((option) => {
              const selected = selection === option.value;

              return (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cn(
                    "min-h-11 min-w-[5.5rem] rounded-none border px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
                    selected
                      ? option.value
                        ? "border-orange-600 bg-orange-600 text-white"
                        : "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400",
                  )}
                  disabled={isPending}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
            {selection == null ? (
              <div
                className="inline-flex min-h-11 items-center rounded-none border border-dashed border-amber-300 bg-amber-50 px-3 text-xs font-semibold uppercase tracking-wide text-amber-900"
                role="status"
              >
                Not checked yet
              </div>
            ) : null}
          </div>

          {showClear ? (
            <button
              type="button"
              className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline disabled:opacity-50"
              disabled={isPending}
              onClick={() => handleSelect(null)}
            >
              Clear answer
            </button>
          ) : null}
        </>
      ) : selection != null ? (
        <p className="text-xs text-zinc-500">Locked after collection.</p>
      ) : (
        <div
          className="inline-flex min-h-11 items-center rounded-none border border-dashed border-amber-300 bg-amber-50 px-3 text-xs font-semibold uppercase tracking-wide text-amber-900"
          role="status"
        >
          Not recorded
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {isPending ? <p className="text-sm text-zinc-500">Saving…</p> : null}
    </div>
  );
}
