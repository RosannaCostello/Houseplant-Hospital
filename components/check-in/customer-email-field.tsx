"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchCheckInCustomersByEmail } from "@/app/actions/search-check-in-customers";
import { AnchoredPortal } from "@/components/ui/anchored-portal";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import type { CustomerSearchResult } from "@/lib/customers/search-customers";
import { scrollFocusedFieldAboveKeyboard } from "@/lib/ui/keyboard-avoidance";
import { cn } from "@/lib/utils";

const EMAIL_AUTOCOMPLETE_MIN_LENGTH = 4;

type CustomerEmailFieldProps = {
  value: string;
  error?: string;
  onChange: (email: string) => void;
  onSelectCustomer: (customer: CustomerSearchResult) => void;
};

export function CustomerEmailField({
  value,
  error,
  onChange,
  onSelectCustomer,
}: CustomerEmailFieldProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<CustomerSearchResult[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [autofillEmail, setAutofillEmail] = useState<string | null>(null);

  useEffect(() => {
    const email = value.trim();

    if (email.length < EMAIL_AUTOCOMPLETE_MIN_LENGTH || email === autofillEmail) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const results = await searchCheckInCustomersByEmail(email);

        if (cancelled) return;

        setSuggestions(results);
        setSuggestionsOpen(results.length > 0);
      } catch {
        if (cancelled) return;

        setSuggestions([]);
        setSuggestionsOpen(false);
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [value, autofillEmail]);

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
    if (autofillEmail && nextValue !== autofillEmail) {
      setAutofillEmail(null);
    }

    onChange(nextValue);
  }

  function handleSelect(customer: CustomerSearchResult) {
    setAutofillEmail(customer.email);
    setSuggestions([]);
    setSuggestionsOpen(false);
    onSelectCustomer(customer);
  }

  const trimmed = value.trim();
  const showHint =
    trimmed.length > 0 && trimmed.length < EMAIL_AUTOCOMPLETE_MIN_LENGTH && trimmed !== autofillEmail;

  return (
    <div ref={containerRef} className="relative">
      <label className={hildaLabelClassName}>
        Email
        <input
          ref={inputRef}
          className={cn(hildaInputClassName, "min-h-11 py-2.5")}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          enterKeyHint="next"
          value={value}
          role="combobox"
          aria-expanded={suggestionsOpen}
          aria-controls={suggestionsOpen ? listboxId : undefined}
          aria-autocomplete="list"
          onChange={(event) => handleChange(event.target.value)}
          onFocus={(event) => {
            scrollFocusedFieldAboveKeyboard(event.currentTarget);
            if (suggestions.length > 0 && value.trim() !== autofillEmail) {
              setSuggestionsOpen(true);
            }
          }}
        />
        {error ? <span className="mt-1 block text-sm text-hilda-error-text">{error}</span> : null}
        {showHint ? (
          <span className="mt-1 block text-sm text-hilda-text-muted">
            Keep typing to search returning customers.
          </span>
        ) : null}
        {isSearching ? (
          <span className="mt-1 block text-sm text-hilda-text-muted">Searching…</span>
        ) : null}
      </label>

      <AnchoredPortal open={suggestionsOpen && suggestions.length > 0} anchorRef={inputRef}>
        <ul
          id={listboxId}
          role="listbox"
          className="max-h-full overflow-y-auto rounded-hilda-sm border border-hilda-border/15 bg-hilda-surface py-1 shadow-lg"
        >
          {suggestions.map((customer) => (
            <li key={customer.id} role="option">
              <button
                type="button"
                className="flex min-h-11 w-full flex-col items-start px-3 py-2.5 text-left transition-colors hover:bg-hilda-bg"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(customer)}
              >
                <span className="text-sm font-medium text-hilda-heading">{customer.email}</span>
                <span className="mt-0.5 text-sm text-hilda-text">
                  {customer.firstName} {customer.lastName}
                  {customer.phone ? ` · ${customer.phone}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </AnchoredPortal>
    </div>
  );
}
