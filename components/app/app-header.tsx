"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppPageTitle } from "@/components/app/app-page-title";

type AppHeaderProps = {
  userEmail?: string | null;
};

function headerPageLabel(pathname: string): string | null {
  if (pathname === "/app") return "Dashboard";
  if (pathname.startsWith("/app/check-in")) return "Check-in";
  if (pathname === "/app/customers") return "Customers";
  if (pathname.startsWith("/settings")) return "Settings";
  return null;
}

export function AppHeader({ userEmail }: AppHeaderProps) {
  const pathname = usePathname();
  const pageTitle = useAppPageTitle();
  const pageLabel = pageTitle ?? headerPageLabel(pathname);

  return (
    <header className="shrink-0 border-b border-hilda-gold/30 bg-hilda-heading">
      <div className="mx-auto flex max-w-[100rem] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link
          href="/app"
          className="flex min-w-0 items-baseline gap-2 font-serif text-base font-normal tracking-tight text-hilda-gold"
        >
          <span className="truncate">Houseplant Hospital</span>
          {pageLabel ? (
            <>
              <span aria-hidden className="shrink-0 font-sans text-sm font-light text-hilda-gold/40">
                |
              </span>
              <span className="min-w-0 truncate font-sans text-sm font-medium uppercase tracking-[0.1em] text-hilda-gold/75">
                {pageLabel}
              </span>
            </>
          ) : null}
        </Link>
        <div className="flex items-center gap-4">
          {userEmail ? (
            <span className="hidden max-w-[14rem] truncate text-sm text-hilda-gold/55 sm:inline">
              {userEmail}
            </span>
          ) : null}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="border border-hilda-gold/45 bg-transparent px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-hilda-gold transition-colors hover:border-hilda-gold hover:bg-hilda-gold/10"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
