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
      className="block rounded-none border border-hilda-border/15 bg-hilda-bg p-4 transition-colors hover:border-hilda-border/20 hover:bg-hilda-surface"
    >
      <p className="text-sm font-semibold text-hilda-heading">
        {customer.firstName} {customer.lastName}
      </p>
      <p className="mt-1 text-sm text-hilda-text">{customer.email}</p>
      {customer.phone ? <p className="mt-0.5 text-sm text-hilda-text-muted">{customer.phone}</p> : null}
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
    <div className="mx-auto w-full max-w-2xl pb-bottom-nav">
      <section className="space-y-6 rounded-none border border-hilda-border/15 bg-hilda-surface p-5 shadow-sm">
        <div className="space-y-2">
          <h2 className="font-serif text-xl font-normal text-hilda-heading">Customer Search</h2>
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
        </div>

        {!hasQuery ? (
          <p className="rounded-none border border-dashed border-hilda-border/15 bg-hilda-bg px-4 py-8 text-center text-sm text-hilda-text-muted">
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
          <p className="rounded-none border border-dashed border-hilda-border/15 bg-hilda-bg px-4 py-8 text-center text-sm text-hilda-text-muted">
            No customers match &ldquo;{initialQuery.trim()}&rdquo;.
          </p>
        )}
      </section>
    </div>
  );
}
