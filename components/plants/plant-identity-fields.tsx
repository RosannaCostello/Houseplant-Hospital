"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { updatePlantIdentityAction } from "@/app/actions/update-plant-identity";
import { SpeciesField } from "@/components/check-in/species-field";
import { registerAutosaveFlusher } from "@/lib/ui/autosave-flush-registry";

type PlantIdentityFieldsProps = {
  plantId: string;
  initialSpecies: string | null;
  disabled?: boolean;
};

/** Species-only identity (plant nicknames removed — HIL-129). */
export function PlantIdentityFields({
  plantId,
  initialSpecies,
  disabled = false,
}: PlantIdentityFieldsProps) {
  const router = useRouter();
  const [species, setSpecies] = useState(initialSpecies ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const latestRef = useRef(initialSpecies ?? "");
  const baselineRef = useRef((initialSpecies ?? "").trim());

  useEffect(() => {
    setSpecies(initialSpecies ?? "");
    latestRef.current = initialSpecies ?? "";
    baselineRef.current = (initialSpecies ?? "").trim();
  }, [initialSpecies]);

  useEffect(() => {
    latestRef.current = species;
  }, [species]);

  function saveIfChanged() {
    if (disabled) return Promise.resolve();

    const next = latestRef.current.trim();
    if (next === baselineRef.current) {
      return Promise.resolve();
    }

    setError(null);

    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await updatePlantIdentityAction({
          plantId,
          name: "",
          species: latestRef.current,
        });

        if (!result.success) {
          setError(result.error);
          resolve();
          return;
        }

        baselineRef.current = latestRef.current.trim();
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 1200);
        router.refresh();
        resolve();
      });
    });
  }

  useEffect(() => {
    return registerAutosaveFlusher(() => saveIfChanged());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flush reads latestRef
  }, [disabled, plantId]);

  return (
    <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
        Plant identity
      </h2>
      <SpeciesField
        value={species}
        compact
        disabled={disabled || isPending}
        onChange={(next) => {
          setSpecies(next);
          latestRef.current = next;
        }}
        onBlur={() => void saveIfChanged()}
      />
      {error ? <p className="mt-2 text-sm text-hilda-error-text">{error}</p> : null}
      {isPending ? (
        <p className="mt-2 text-xs text-hilda-text-muted">Saving…</p>
      ) : savedFlash ? (
        <p className="mt-2 text-xs text-hilda-text-muted">Saved</p>
      ) : null}
    </section>
  );
}
