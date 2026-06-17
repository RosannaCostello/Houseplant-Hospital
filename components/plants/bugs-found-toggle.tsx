"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setBugsFoundAction } from "@/app/actions/set-bugs-found";

type BugsFoundToggleProps = {
  plantId: string;
  bugsFound: boolean;
  surchargePercent: number | null;
  disabled?: boolean;
};

export function BugsFoundToggle({
  plantId,
  bugsFound,
  surchargePercent,
  disabled = false,
}: BugsFoundToggleProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(bugsFound);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setChecked(bugsFound);
  }, [bugsFound]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.checked;
    setError(null);

    startTransition(async () => {
      const result = await setBugsFoundAction(plantId, next);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setChecked(next);
      router.refresh();
    });
  }

  return (
    <div className="sm:col-span-2">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 rounded border-zinc-300"
          checked={checked}
          disabled={isPending || disabled}
          onChange={handleChange}
        />
        <span className="text-sm leading-6 text-zinc-800">
          <span className="font-medium text-zinc-900">Bugs found</span>
          {surchargePercent != null ? (
            <span className="text-zinc-600"> — applies +{surchargePercent}% treatment surcharge</span>
          ) : null}
          {checked ? (
            <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-orange-600">
              Flagged on dashboard and labels
            </span>
          ) : null}
          {disabled ? (
            <span className="mt-1 block text-xs text-zinc-500">Cannot change after collection.</span>
          ) : null}
        </span>
      </label>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {isPending ? <p className="mt-1 text-xs text-zinc-500">Updating…</p> : null}
    </div>
  );
}
