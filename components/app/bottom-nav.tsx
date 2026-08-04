"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnalyticsNavIcon,
  CheckInNavIcon,
  DashboardNavIcon,
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
    href: "/app/check-in",
    label: "Check-in",
    icon: CheckInNavIcon,
    isActive: (pathname) => pathname.startsWith("/app/check-in"),
  },
  {
    href: "/app",
    label: "Dashboard",
    icon: DashboardNavIcon,
    isActive: (pathname) => pathname === "/app",
  },
  // Customers nav hidden for now — route `/app/customers` remains available via links.
  // Settings moved to Account menu in the header (HIL-109).
  {
    href: "/app/analytics",
    label: "Analytics",
    icon: AnalyticsNavIcon,
    isActive: (pathname) => pathname.startsWith("/app/analytics"),
    adminOnly: true,
  },
];

type BottomNavProps = {
  isAdmin?: boolean;
};

export function BottomNav({ isAdmin = false }: BottomNavProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const checkInHandoff = pathname.startsWith("/app/check-in");

  return (
    <div className="bottom-nav-glass-host pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <nav
        aria-label="Main"
        className={cn(
          "bottom-nav-glass pointer-events-auto flex w-full max-w-lg items-stretch gap-2 p-1.5 sm:gap-2.5",
          checkInHandoff && "opacity-70",
        )}
      >
        {items.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          const leavePath = checkInHandoff && !item.isActive("/app/check-in");

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative z-10 flex min-h-[3.5rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] font-medium uppercase leading-tight tracking-wide transition-all duration-300 sm:min-h-[3.65rem] sm:gap-1 sm:px-3 sm:py-2 sm:text-[13px]",
                active
                  ? "bottom-nav-glass-tab-active text-hilda-gold"
                  : leavePath
                    ? "text-hilda-nav-ink/45 hover:bg-white/10 hover:text-hilda-nav-ink/70"
                    : "text-hilda-nav-ink hover:bg-white/20 hover:text-hilda-heading",
              )}
            >
              <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
