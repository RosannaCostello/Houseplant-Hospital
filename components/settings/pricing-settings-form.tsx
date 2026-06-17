"use client";

import { useState, useTransition } from "react";
import { updatePricingSettingsAction } from "@/app/actions/update-pricing-settings";
import { Button } from "@/components/ui/button";
import { checkInInputClassName, checkInLabelClassName } from "@/lib/check-in/form-styles";
import type { PlantSize } from "@/lib/plant-size";
import { PLANT_SIZES } from "@/lib/plant-size";
import type { PricingSettings } from "@/lib/pricing/get-pricing-settings";

type PricingSettingsFormProps = {
  settings: PricingSettings;
};

export function PricingSettingsForm({ settings }: PricingSettingsFormProps) {
  const [basePrices, setBasePrices] = useState<Record<PlantSize, string>>(
    Object.fromEntries(PLANT_SIZES.map((size) => [size, String(settings.basePrices[size].amount)])) as Record<
      PlantSize,
      string
    >,
  );
  const [bugsSurchargePercent, setBugsSurchargePercent] = useState(
    String(settings.bugsSurcharge.percent),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleBasePriceChange(size: PlantSize, value: string) {
    setBasePrices((current) => ({ ...current, [size]: value }));
    setSaved(false);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const parsedBasePrices = Object.fromEntries(
      PLANT_SIZES.map((size) => [size, Number(basePrices[size])]),
    ) as Record<PlantSize, number>;

    startTransition(async () => {
      const result = await updatePricingSettingsAction({
        basePrices: parsedBasePrices,
        bugsSurchargePercent: Number(bugsSurchargePercent),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSaved(true);
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Size-band pricing</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Base treatment prices by plant size. Used by the pricing engine on plant detail and collection.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANT_SIZES.map((size) => (
          <label key={size} className={checkInLabelClassName}>
            {size} base price (£)
            <input
              className={checkInInputClassName}
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={basePrices[size]}
              disabled={isPending}
              onChange={(event) => handleBasePriceChange(size, event.target.value)}
            />
          </label>
        ))}
      </div>

      <label className={checkInLabelClassName}>
        Bugs found surcharge (%)
        <input
          className={checkInInputClassName}
          type="number"
          min="0"
          step="0.1"
          inputMode="decimal"
          value={bugsSurchargePercent}
          disabled={isPending}
          onChange={(event) => {
            setBugsSurchargePercent(event.target.value);
            setSaved(false);
            setError(null);
          }}
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700">Pricing settings saved.</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save pricing"}
      </Button>
    </form>
  );
}
