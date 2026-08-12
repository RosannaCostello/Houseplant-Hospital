"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateStackingCardsEnabledAction } from "@/app/actions/care-tip-settings";
import { Button } from "@/components/ui/button";

type DashboardSettingsFormProps = {
  stackingCardsEnabled: boolean;
};

export function DashboardSettingsForm({ stackingCardsEnabled }: DashboardSettingsFormProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(stackingCardsEnabled);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSave(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateStackingCardsEnabledAction({ enabled });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      setError(null);
      setMessage(enabled ? "Stacking cards turned on." : "Stacking cards turned off.");
      router.refresh();
    });
  }

  return (
    <form className="space-y-4" onSubmit={onSave}>
      <div>
        <h2 className="font-serif text-xl text-hilda-heading">Dashboard</h2>
        <p className="mt-1 text-sm text-hilda-text">
          Control how multi-plant drop-offs appear on the board.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-hilda border border-hilda-border/15 bg-hilda-bg p-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-hilda-bugs"
          checked={enabled}
          disabled={isPending}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span>
          <span className="block text-sm font-semibold text-hilda-heading">Stacking cards</span>
          <span className="mt-0.5 block text-sm text-hilda-text">
            When on, plants from the same drop-off in the same lane stack like an iMessage photo
            fan. Swipe to move between plants.
          </span>
        </span>
      </label>

      {error ? <p className="text-sm text-hilda-error-text">{error}</p> : null}
      {message ? <p className="text-sm text-hilda-text">{message}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save dashboard settings"}
      </Button>
    </form>
  );
}
