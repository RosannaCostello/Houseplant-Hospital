"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { checkInInputClassName } from "@/lib/check-in/form-styles";
import type { CustomerSearchResult } from "@/lib/customers/search-customers";

type CustomerSearchViewProps = {
  initialQuery: string;
  results: CustomerSearchResult[];
};

function CustomerResultRow({ customer }: { customer: CustomerSearchResult }) {
  return (
    <Link
      href={`/app/customers/${customer.id}`}
      className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
    >
      <p className="text-sm font-semibold text-zinc-900">
        {customer.firstName} {customer.lastName}
      </p>
      <p className="mt-1 text-sm text-zinc-600">{customer.email}</p>
      {customer.phone ? <p className="mt-0.5 text-sm text-zinc-500">{customer.phone}</p> : null}
    </Link>
  );
}

export function CustomerSearchView({ initialQuery, results }: CustomerSearchViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed === initialQuery.trim()) return;

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams();

      if (trimmed) {
        params.set("q", trimmed);
      }

      const next = params.toString();
      router.replace(next ? `/app/customers?${next}` : "/app/customers");
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, initialQuery, router]);

  const hasQuery = initialQuery.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div>
        <Link href="/app" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          ← Back to dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Customer search
        </h1>
        <p className="mt-1 text-base text-zinc-600">
          Search by name, email, or phone to find a customer and their visit history.
        </p>
      </div>

      <label className="block">
        <span className="sr-only">Search customers</span>
        <input
          className={checkInInputClassName}
          type="search"
          name="q"
          placeholder="Name, email, or phone…"
          autoComplete="off"
          autoFocus
          enterKeyHint="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {!hasQuery ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
          Start typing to search customers.
        </p>
      ) : results.length > 0 ? (
        <ul className="space-y-3">
          {results.map((customer) => (
            <li key={customer.id}>
              <CustomerResultRow customer={customer} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
          No customers match &ldquo;{initialQuery.trim()}&rdquo;.
        </p>
      )}
    </div>
  );
}
