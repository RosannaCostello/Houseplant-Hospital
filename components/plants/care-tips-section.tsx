"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addCareTipAction } from "@/app/actions/add-care-tip";
import { Button } from "@/components/ui/button";
import { checkInInputClassName, checkInLabelClassName } from "@/lib/check-in/form-styles";
import type { PlantDetailCareTip } from "@/lib/plants/get-plant-detail";

type CareTipsSectionProps = {
  plantId: string;
  tips: PlantDetailCareTip[];
};

function formatTipTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function CareTipsSection({ plantId, tips }: CareTipsSectionProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await addCareTipAction(plantId, content);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setContent("");
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Care tips</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Advice for the customer when they collect their plant.
        </p>
      </div>

      {tips.length > 0 ? (
        <ul className="space-y-3">
          {tips.map((tip) => (
            <li key={tip.id} className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm text-zinc-900">{tip.content}</p>
              <p className="mt-2 text-xs text-zinc-500">{formatTipTimestamp(tip.createdAt)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          No care tips yet.
        </p>
      )}

      <form className="space-y-3 border-t border-zinc-100 pt-4" onSubmit={handleSubmit}>
        <label className={checkInLabelClassName}>
          Add care tip
          <textarea
            className={`${checkInInputClassName} min-h-[6rem] resize-y`}
            name="content"
            rows={3}
            placeholder="Water lightly twice a week, keep away from direct sun…"
            value={content}
            disabled={isPending}
            onChange={(event) => {
              setContent(event.target.value);
              setError(null);
            }}
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" disabled={isPending || !content.trim()}>
          {isPending ? "Saving…" : "Save care tip"}
        </Button>
      </form>
    </section>
  );
}
