"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchPlantSpeciesAction } from "@/app/actions/search-plant-species";
import { AnchoredPortal } from "@/components/ui/anchored-portal";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import { SPECIES_AUTOCOMPLETE_MIN_LENGTH } from "@/lib/plants/species-constants";
import { scrollFocusedFieldAboveKeyboard } from "@/lib/ui/keyboard-avoidance";
import { cn } from "@/lib/utils";

type SpeciesFieldProps = {
  value: string;
  error?: string;
  onChange: (species: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  compact?: boolean;
};

export function SpeciesField({
  value,
  error,
  onChange,
  onBlur,
  disabled = false,
  compact = false,
}: SpeciesFieldProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  useEffect(() => {
    const query = value.trim();

    if (
      query.length < SPECIES_AUTOCOMPLETE_MIN_LENGTH ||
      (selectedSuggestion !== null && query.toLowerCase() === selectedSuggestion.toLowerCase())
    ) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const results = await searchPlantSpeciesAction(query);

        if (cancelled) return;

        const filtered = results.filter((species) => species !== query);

        setSuggestions(filtered);
        setSuggestionsOpen(filtered.length > 0);
      } catch {
        if (cancelled) return;

        setSuggestions([]);
        setSuggestionsOpen(false);
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [value, selectedSuggestion]);

  useEffect(() => {
    if (!suggestionsOpen) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      const portal = document.getElementById(listboxId);
      if (portal?.contains(target)) return;
      setSuggestionsOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [listboxId, suggestionsOpen]);

  function handleChange(nextValue: string) {
    if (
      selectedSuggestion &&
      nextValue.trim().toLowerCase() !== selectedSuggestion.toLowerCase()
    ) {
      setSelectedSuggestion(null);
    }

    onChange(nextValue);
  }

  function handleSelect(species: string) {
    setSelectedSuggestion(species);
    setSuggestions([]);
    setSuggestionsOpen(false);
    onChange(species);
    // Defer so parent state includes the selection before save-on-blur.
    window.setTimeout(() => onBlur?.(), 0);
  }

  const trimmed = value.trim();
  const showHint =
    trimmed.length > 0 &&
    trimmed.length < SPECIES_AUTOCOMPLETE_MIN_LENGTH &&
    trimmed.toLowerCase() !== selectedSuggestion?.toLowerCase();

  return (
    <div ref={containerRef} className="relative">
      <label className={compact ? "block text-xs font-semibold uppercase tracking-wide text-hilda-text-muted" : hildaLabelClassName}>
        {compact ? (
          "Species"
        ) : (
          <>
            Species <span className="font-normal text-hilda-text-muted">(optional)</span>
          </>
        )}
        <input
          ref={inputRef}
          className={cn(
            compact
              ? "mt-1 w-full rounded-hilda-sm border border-hilda-border/25 bg-hilda-surface px-3 py-2 text-sm text-hilda-heading outline-none focus:border-hilda-text/50 disabled:opacity-60"
              : cn(hildaInputClassName, "min-h-11 py-2.5"),
          )}
          type="text"
          autoComplete="off"
          value={value}
          disabled={disabled}
          role="combobox"
          aria-expanded={suggestionsOpen}
          aria-controls={suggestionsOpen ? listboxId : undefined}
          aria-autocomplete="list"
          placeholder="e.g. Monstera deliciosa"
          onChange={(event) => handleChange(event.target.value)}
          onBlur={() => onBlur?.()}
          onFocus={(event) => {
            scrollFocusedFieldAboveKeyboard(event.currentTarget);
            if (
              suggestions.length > 0 &&
              value.trim().toLowerCase() !== selectedSuggestion?.toLowerCase()
            ) {
              setSuggestionsOpen(true);
            }
          }}
        />
        {error ? <span className="mt-1 block text-sm text-hilda-error-text">{error}</span> : null}
        {showHint && !compact ? (
          <span className="mt-1 block text-sm text-hilda-text-muted">
            Keep typing to see known species.
          </span>
        ) : null}
        {isSearching && !compact ? (
          <span className="mt-1 block text-sm text-hilda-text-muted">Searching…</span>
        ) : null}
      </label>

      <AnchoredPortal open={suggestionsOpen && suggestions.length > 0 && !disabled} anchorRef={inputRef}>
        <ul
          id={listboxId}
          role="listbox"
          className="max-h-full overflow-y-auto rounded-hilda-sm border border-hilda-border/15 bg-hilda-surface py-1 shadow-lg"
        >
          {suggestions.map((species) => (
            <li key={species.toLowerCase()} role="option">
              <button
                type="button"
                className="flex min-h-11 w-full items-start px-3 py-2.5 text-left text-sm text-hilda-heading transition-colors hover:bg-hilda-bg"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(species)}
              >
                {species}
              </button>
            </li>
          ))}
        </ul>
      </AnchoredPortal>
    </div>
  );
}
