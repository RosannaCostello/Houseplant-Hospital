"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppPageTitle } from "@/components/app/app-page-title";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  userEmail?: string | null;
  isAdmin?: boolean;
};

function headerPageLabel(pathname: string): string | null {
  if (pathname === "/app") return "Dashboard";
  if (pathname.startsWith("/app/check-in")) return "Check-in";
  if (pathname === "/app/customers") return "Customers";
  if (pathname.startsWith("/app/analytics")) return "Analytics";
  if (pathname.startsWith("/settings")) return "Settings";
  return null;
}

export function AppHeader({ userEmail, isAdmin = false }: AppHeaderProps) {
  const pathname = usePathname();
  const pageTitle = useAppPageTitle();
  const pageLabel = pageTitle ?? headerPageLabel(pathname);
  const menuId = useId();
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const logoutFormRef = useRef<HTMLFormElement>(null);
  const checkInHandoff = pathname.startsWith("/app/check-in");

  useEffect(() => {
    if (!accountOpen) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setAccountOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  return (
    <header className="shrink-0 border-b border-hilda-gold/30 bg-hilda-heading">
      <div className="mx-auto flex max-w-[100rem] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link
          href="/app"
          className={cn(
            "flex min-w-0 items-baseline gap-2 font-serif text-base font-normal tracking-tight text-hilda-gold",
            checkInHandoff && "opacity-60",
          )}
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

        <div className={cn("relative", checkInHandoff && "opacity-55")} ref={menuRef}>
          <button
            ref={triggerRef}
            type="button"
            className={cn(
              "inline-flex max-w-[14rem] items-center gap-2 rounded-full border border-hilda-gold/45 bg-transparent px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-hilda-gold transition-colors hover:border-hilda-gold hover:bg-hilda-gold/10",
              accountOpen && "border-hilda-gold bg-hilda-gold/10",
            )}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-controls={menuId}
            onClick={() => setAccountOpen((open) => !open)}
          >
            <span className="truncate">{userEmail?.trim() || "Account"}</span>
            <span aria-hidden className="text-hilda-gold/70">
              ▾
            </span>
          </button>

          {accountOpen ? (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 z-[60] mt-2 min-w-[11rem] overflow-hidden rounded-hilda border border-hilda-border/15 bg-hilda-surface shadow-lg"
            >
              {isAdmin ? (
                <Link
                  role="menuitem"
                  href="/settings"
                  className="block min-h-11 px-4 py-2.5 text-sm font-medium text-hilda-heading hover:bg-hilda-bg"
                  onClick={() => setAccountOpen(false)}
                >
                  Settings
                </Link>
              ) : null}
              <button
                role="menuitem"
                type="button"
                className="flex min-h-11 w-full px-4 py-2.5 text-left text-sm font-medium text-hilda-heading hover:bg-hilda-bg"
                onClick={() => {
                  setAccountOpen(false);
                  setConfirmLogout(true);
                }}
              >
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <form ref={logoutFormRef} action="/auth/signout" method="post" className="hidden" />

      <ConfirmDialog
        open={confirmLogout}
        title="Log out?"
        message="Sign out of Houseplant Hospital on this device?"
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        destructive
        onConfirm={() => {
          setConfirmLogout(false);
          logoutFormRef.current?.requestSubmit();
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </header>
  );
}
