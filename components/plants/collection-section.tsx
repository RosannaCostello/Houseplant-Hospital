"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updatePlantFinalPriceAction } from "@/app/actions/update-plant-final-price";
import { Button } from "@/components/ui/button";
import { checkInInputClassName, checkInLabelClassName } from "@/lib/check-in/form-styles";
import { formatGbp } from "@/lib/pricing/format-gbp";
import { cn } from "@/lib/utils";

type CollectionSectionProps = {
  plantId: string;
  isCollected: boolean;
  suggestedFinalPrice: number | null;
  finalPrice: number | null;
  collectedAt: string | null;
  compact?: boolean;
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

function initialPriceInput(
  finalPrice: number | null,
  suggestedFinalPrice: number | null,
): string {
  if (finalPrice != null) return formatSuggestedPrice(finalPrice);
  return formatSuggestedPrice(suggestedFinalPrice);
}

export function CollectionSection({
  plantId,
  isCollected,
  suggestedFinalPrice,
  finalPrice,
  collectedAt,
  compact = false,
}: CollectionSectionProps) {
  const router = useRouter();
  const [priceInput, setPriceInput] = useState(initialPriceInput(finalPrice, suggestedFinalPrice));
  const [priceTouched, setPriceTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!priceTouched) {
      setPriceInput(initialPriceInput(finalPrice, suggestedFinalPrice));
    }
  }, [finalPrice, suggestedFinalPrice, priceTouched]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSavedMessage(null);

    const price = Number(priceInput);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a final price greater than zero.");
      return;
    }

    startTransition(async () => {
      const result = await updatePlantFinalPriceAction(plantId, price);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setPriceTouched(false);
      setSavedMessage("Price saved.");
      router.refresh();
    });
  }

  const sectionClass = compact
    ? "space-y-2 rounded-none border border-zinc-200 bg-white p-3"
    : "space-y-4 rounded-none border border-zinc-200 bg-white p-5 shadow-sm";

  return (
    <section className={sectionClass}>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Collection</h2>
        {!compact ? (
          <p className="mt-1 text-sm text-zinc-600">
            {isCollected
              ? "Final price charged at collection. Amend here if needed."
              : "Set the price to charge at the till. Move to Collected on the dashboard when the customer picks up."}
          </p>
        ) : null}
      </div>

      {isCollected && collectedAt ? (
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-zinc-600">Collected</dt>
            <dd className="font-medium text-zinc-900">{formatCollectedAt(collectedAt)}</dd>
          </div>
        </dl>
      ) : null}

      <form className="space-y-2" onSubmit={handleSubmit}>
        <label className={checkInLabelClassName}>
          Final price (£)
          <input
            className={cn(checkInInputClassName, compact && "py-2.5")}
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
              setSavedMessage(null);
            }}
          />
        </label>
        {!priceTouched && finalPrice == null && suggestedFinalPrice != null ? (
          <p className="text-xs text-zinc-500">
            Suggested from current pricing estimate: {formatGbp(suggestedFinalPrice)}
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {savedMessage ? <p className="text-sm text-zinc-600">{savedMessage}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save price"}
        </Button>
      </form>
    </section>
  );
}
