"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { collectPlantAction } from "@/app/actions/collect-plant";
import { Button } from "@/components/ui/button";
import { checkInInputClassName, checkInLabelClassName } from "@/lib/check-in/form-styles";
import { formatGbp } from "@/lib/pricing/format-gbp";

type CollectionSectionProps = {
  plantId: string;
  isCollected: boolean;
  suggestedFinalPrice: number | null;
  finalPrice: number | null;
  collectedAt: string | null;
};

function formatSuggestedPrice(value: number | null): string {
  return value != null ? value.toFixed(2) : "";
}

function formatCollectedAt(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function CollectionSection({
  plantId,
  isCollected,
  suggestedFinalPrice,
  finalPrice,
  collectedAt,
}: CollectionSectionProps) {
  const router = useRouter();
  const [priceInput, setPriceInput] = useState(formatSuggestedPrice(suggestedFinalPrice));
  const [priceTouched, setPriceTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!priceTouched) {
      setPriceInput(formatSuggestedPrice(suggestedFinalPrice));
    }
  }, [suggestedFinalPrice, priceTouched]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const price = Number(priceInput);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a final price greater than zero.");
      return;
    }

    startTransition(async () => {
      const result = await collectPlantAction(plantId, price);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Collection</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {isCollected
            ? "This plant has been collected and paid for."
            : "Record the final price charged and move the plant to Collected."}
        </p>
      </div>

      {isCollected ? (
        finalPrice != null ? (
          <dl className="space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-zinc-600">Final price charged</dt>
              <dd className="text-base font-semibold tabular-nums text-zinc-900">{formatGbp(finalPrice)}</dd>
            </div>
            {collectedAt ? (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-zinc-600">Collected</dt>
                <dd className="font-medium text-zinc-900">{formatCollectedAt(collectedAt)}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-zinc-600">
            Collected via status change. No final price was recorded for this plant.
          </p>
        )
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className={checkInLabelClassName}>
            Final price (£)
            <input
              className={checkInInputClassName}
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={priceInput}
              disabled={isPending}
              onChange={(event) => {
                setPriceInput(event.target.value);
                setPriceTouched(true);
                setError(null);
              }}
            />
          </label>
          <p className="text-xs text-zinc-500">
            {suggestedFinalPrice != null ? (
              <>Suggested from current pricing estimate: {formatGbp(suggestedFinalPrice)}</>
            ) : (
              "No pricing estimate available. Enter the final price manually."
            )}
          </p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Mark as collected"}
          </Button>
        </form>
      )}
    </section>
  );
}
