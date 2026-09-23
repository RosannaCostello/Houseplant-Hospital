"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setBugsFoundAction } from "@/app/actions/set-bugs-found";
import { BugsFoundToggleField } from "@/components/plants/bugs-found-toggle-field";

type BugsFoundToggleProps = {
  plantId: string;
  bugsFound: boolean | null;
  disabled?: boolean;
  /** Called after a successful save so open plant cards can update without close/reopen. */
  onBugsFoundChange?: (bugsFound: boolean | null) => void;
};

export function BugsFoundToggle({
  plantId,
  bugsFound,
  disabled = false,
  onBugsFoundChange,
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
      onBugsFoundChange?.(result.bugsFound);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <BugsFoundToggleField
        value={selection}
        onChange={handleSelect}
        disabled={disabled}
        pending={isPending}
      />
      {error ? <p className="text-sm text-hilda-error-text">{error}</p> : null}
      {isPending ? <p className="text-sm text-hilda-text-muted">Saving…</p> : null}
    </div>
  );
}
