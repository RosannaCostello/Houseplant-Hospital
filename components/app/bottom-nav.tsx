"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckInNavIcon,
  CustomersNavIcon,
  DashboardNavIcon,
  SettingsNavIcon,
} from "@/components/app/nav-icons";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/app",
    label: "Dashboard",
    icon: DashboardNavIcon,
    isActive: (pathname) => pathname === "/app",
  },
  {
    href: "/app/check-in",
    label: "Check-in",
    icon: CheckInNavIcon,
    isActive: (pathname) => pathname.startsWith("/app/check-in"),
  },
  {
    href: "/app/customers",
    label: "Customers",
    icon: CustomersNavIcon,
    isActive: (pathname) => pathname.startsWith("/app/customers"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsNavIcon,
    isActive: (pathname) => pathname.startsWith("/settings"),
    adminOnly: true,
  },
];

type BottomNavProps = {
  isAdmin?: boolean;
};

export function BottomNav({ isAdmin = false }: BottomNavProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav
      aria-label="Main"
      className="bottom-nav-glass fixed inset-x-0 bottom-0 z-50 flex w-full items-stretch gap-1 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {items.map((item) => {
        const active = item.isActive(pathname);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[3.9rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-none px-2 py-2 text-xs font-medium uppercase leading-tight tracking-wide transition-all duration-200 sm:text-[13px]",
              active
                ? "bg-hilda-coral text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                : "text-hilda-nav-ink hover:bg-hilda-nav-ink/10 hover:text-hilda-nav-ink",
            )}
          >
            <Icon className="h-6 w-6 shrink-0" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
