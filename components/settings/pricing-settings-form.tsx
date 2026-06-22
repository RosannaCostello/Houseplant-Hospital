"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncShopifyPricingAction } from "@/app/actions/sync-shopify-pricing";
import { updatePricingSettingsAction } from "@/app/actions/update-pricing-settings";
import { Button } from "@/components/ui/button";
import { checkInInputClassName, checkInLabelClassName } from "@/lib/check-in/form-styles";
import type { PlantSize } from "@/lib/plant-size";
import { PLANT_SIZES } from "@/lib/plant-size";
import { formatGbp } from "@/lib/pricing/format-gbp";
import type { PricingSettings } from "@/lib/pricing/get-pricing-settings";

type PricingSettingsFormProps = {
  settings: PricingSettings;
};

function formatSyncedAt(value: string | null): string {
  if (!value) return "Never";

  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function sizeLabel(size: PlantSize, shopifySizeLabel: string): string {
  if (size === "XS") {
    return `${size} (Shopify: ${shopifySizeLabel})`;
  }

  return size;
}

export function PricingSettingsForm({ settings }: PricingSettingsFormProps) {
  const router = useRouter();
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
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();

  const shopifyMode = settings.shopifyConfigured;

  function handleBasePriceChange(size: PlantSize, value: string) {
    setBasePrices((current) => ({ ...current, [size]: value }));
    setSaved(false);
    setError(null);
  }

  function handleSync() {
    setSyncMessage(null);
    setError(null);

    startSyncTransition(async () => {
      const result = await syncShopifyPricingAction();

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSyncMessage(`Synced ${result.sizesUpdated} size bands from Shopify.`);
      router.refresh();
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSyncMessage(null);

    startTransition(async () => {
      const result = await updatePricingSettingsAction({
        basePrices: shopifyMode
          ? undefined
          : (Object.fromEntries(
              PLANT_SIZES.map((size) => [size, Number(basePrices[size])]),
            ) as Record<PlantSize, number>),
        bugsSurchargePercent: Number(bugsSurchargePercent),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {shopifyMode ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-hilda-text-muted">Shopify pricing</h2>
              <p className="mt-1 text-sm text-hilda-text">
                Base and pests treatment prices sync from Shopify daily. XS in the app maps to{" "}
                <strong>Mini</strong> in Shopify on both products.
              </p>
              <p className="mt-1 text-xs text-hilda-text-muted">
                Last synced: {formatSyncedAt(settings.shopifySyncedAt)}
              </p>
            </div>
            <Button type="button" variant="outline" disabled={isSyncing} onClick={handleSync}>
              {isSyncing ? "Syncing…" : "Sync from Shopify"}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-none border border-hilda-border/15">
            <table className="min-w-full text-sm">
              <thead className="bg-hilda-bg text-left text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
                <tr>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Standard</th>
                  <th className="px-4 py-3">Pests (with bugs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hilda-border/10">
                {PLANT_SIZES.map((size) => (
                  <tr key={size}>
                    <td className="px-4 py-3 font-medium text-hilda-heading">
                      {sizeLabel(size, settings.shopifySizeLabels[size])}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-hilda-heading">
                      {formatGbp(settings.basePrices[size].amount)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-hilda-heading">
                      {settings.pestsPrices[size] != null
                        ? formatGbp(settings.pestsPrices[size])
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {syncMessage ? <p className="text-sm text-emerald-700">{syncMessage}</p> : null}
          {error ? <p className="text-sm text-hilda-error-text">{error}</p> : null}
        </section>
      ) : null}

      {!shopifyMode ? (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-hilda-text-muted">Size-band pricing</h2>
            <p className="mt-1 text-sm text-hilda-text">
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

          <div>
            <label className={checkInLabelClassName}>
              Bugs surcharge (%)
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
          </div>

          {error ? <p className="text-sm text-hilda-error-text">{error}</p> : null}
          {saved ? <p className="text-sm text-emerald-700">Pricing settings saved.</p> : null}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save pricing"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
