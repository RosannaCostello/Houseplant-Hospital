"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { updatePlantIdentityAction } from "@/app/actions/update-plant-identity";
import { SpeciesField } from "@/components/check-in/species-field";
import { registerAutosaveFlusher } from "@/lib/ui/autosave-flush-registry";
import { scrollFocusedFieldAboveKeyboard } from "@/lib/ui/keyboard-avoidance";

type PlantIdentityFieldsProps = {
  plantId: string;
  initialName: string | null;
  initialSpecies: string | null;
  disabled?: boolean;
};

export function PlantIdentityFields({
  plantId,
  initialName,
  initialSpecies,
  disabled = false,
}: PlantIdentityFieldsProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [species, setSpecies] = useState(initialSpecies ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const latestRef = useRef({ name: initialName ?? "", species: initialSpecies ?? "" });
  const baselineRef = useRef({
    name: (initialName ?? "").trim(),
    species: (initialSpecies ?? "").trim(),
  });

  useEffect(() => {
    setName(initialName ?? "");
    setSpecies(initialSpecies ?? "");
    latestRef.current = { name: initialName ?? "", species: initialSpecies ?? "" };
    baselineRef.current = {
      name: (initialName ?? "").trim(),
      species: (initialSpecies ?? "").trim(),
    };
  }, [initialName, initialSpecies]);

  useEffect(() => {
    latestRef.current = { name, species };
  }, [name, species]);

  function saveIfChanged() {
    if (disabled) return Promise.resolve();

    const next = {
      name: latestRef.current.name.trim(),
      species: latestRef.current.species.trim(),
    };
    if (
      next.name === baselineRef.current.name &&
      next.species === baselineRef.current.species
    ) {
      return Promise.resolve();
    }

    setError(null);

    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await updatePlantIdentityAction({
          plantId,
          name: latestRef.current.name,
          species: latestRef.current.species,
        });

        if (!result.success) {
          setError(result.error);
          resolve();
          return;
        }

        baselineRef.current = {
          name: latestRef.current.name.trim(),
          species: latestRef.current.species.trim(),
        };
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
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
          Plant name
          <input
            type="text"
            className="mt-1 w-full rounded-hilda-sm border border-hilda-border/25 bg-hilda-surface px-3 py-2 text-sm text-hilda-heading outline-none focus:border-hilda-text/50 disabled:opacity-60"
            value={name}
            disabled={disabled || isPending}
            placeholder="Optional"
            autoComplete="off"
            onChange={(event) => {
              const next = event.target.value;
              setName(next);
              latestRef.current = { ...latestRef.current, name: next };
            }}
            onFocus={(event) => scrollFocusedFieldAboveKeyboard(event.currentTarget)}
            onBlur={() => void saveIfChanged()}
          />
        </label>
        <SpeciesField
          value={species}
          compact
          disabled={disabled || isPending}
          onChange={(next) => {
            setSpecies(next);
            latestRef.current = { ...latestRef.current, species: next };
          }}
          onBlur={() => void saveIfChanged()}
        />
      </div>
      {error ? <p className="mt-2 text-sm text-hilda-error-text">{error}</p> : null}
      {isPending ? (
        <p className="mt-2 text-xs text-hilda-text-muted">Saving…</p>
      ) : savedFlash ? (
        <p className="mt-2 text-xs text-hilda-text-muted">Saved</p>
      ) : null}
    </section>
  );
}
