"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchCheckInCustomersByEmail } from "@/app/actions/search-check-in-customers";
import { checkInInputClassName, checkInLabelClassName } from "@/lib/check-in/form-styles";
import type { CustomerSearchResult } from "@/lib/customers/search-customers";
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
      if (containerRef.current?.contains(event.target as Node)) return;
      setSuggestionsOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [suggestionsOpen]);

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
      <label className={checkInLabelClassName}>
        Email
        <input
          className={checkInInputClassName}
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
          onFocus={() => {
            if (suggestions.length > 0 && value.trim() !== autofillEmail) {
              setSuggestionsOpen(true);
            }
          }}
        />
        {error ? <span className="mt-1 block text-sm text-red-600">{error}</span> : null}
        {showHint ? (
          <span className="mt-1 block text-sm text-zinc-500">
            Keep typing to search returning customers.
          </span>
        ) : null}
        {isSearching ? (
          <span className="mt-1 block text-sm text-zinc-500">Searching…</span>
        ) : null}
      </label>

      {suggestionsOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-none border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((customer) => (
            <li key={customer.id} role="option">
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-start px-3 py-2.5 text-left transition-colors hover:bg-zinc-50",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(customer)}
              >
                <span className="text-sm font-medium text-zinc-900">{customer.email}</span>
                <span className="mt-0.5 text-sm text-zinc-600">
                  {customer.firstName} {customer.lastName}
                  {customer.phone ? ` · ${customer.phone}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
