"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { bindKeyboardAvoidance } from "@/lib/ui/keyboard-avoidance";
import { cn } from "@/lib/utils";

type CheckInStepShellProps = {
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  status?: ReactNode;
  maxWidth?: "2xl" | "3xl";
};

const KEYBOARD_OPEN_PX = 80;

/**
 * Check-in layout. When the iPad keyboard is open, the shell is locked to the
 * remaining visualViewport (the strip above the keyboard) instead of padding
 * the footer by the keyboard height — that previously ate the form in landscape.
 */
export function CheckInStepShell({
  header,
  children,
  footer,
  status,
  maxWidth = "2xl",
}: CheckInStepShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    return bindKeyboardAvoidance(rootRef.current);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const vv = window.visualViewport;
    if (!root || !vv) return;

    function apply() {
      if (!vv || !root) return;
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      const open = inset > KEYBOARD_OPEN_PX;
      setKeyboardOpen(open);
      document.documentElement.classList.toggle("hh-keyboard-open", open);

      if (open) {
        root.style.position = "fixed";
        root.style.top = `${vv.offsetTop}px`;
        root.style.left = "0";
        root.style.right = "0";
        root.style.height = `${vv.height}px`;
        root.style.maxHeight = `${vv.height}px`;
        root.style.zIndex = "70";
        root.style.paddingBottom = "0";
        root.style.margin = "0 auto";
      } else {
        root.style.position = "";
        root.style.top = "";
        root.style.left = "";
        root.style.right = "";
        root.style.height = "";
        root.style.maxHeight = "";
        root.style.zIndex = "";
        root.style.paddingBottom = "";
        root.style.margin = "";
      }
    }

    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    return () => {
      document.documentElement.classList.remove("hh-keyboard-open");
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-keyboard-open={keyboardOpen ? "true" : "false"}
      className={cn(
        "mx-auto flex h-full min-h-0 w-full flex-col bg-hilda-bg pb-[var(--bottom-nav-inset)]",
        "data-[keyboard-open=true]:px-4 data-[keyboard-open=true]:pb-2 sm:data-[keyboard-open=true]:px-6",
        maxWidth === "3xl" ? "max-w-3xl" : "max-w-2xl",
      )}
    >
      <div className="hh-check-in-header shrink-0">{header}</div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden landscape:mt-1">
        {children}
      </div>

      {status ? <div className="shrink-0 space-y-1 pt-1">{status}</div> : null}

      <div className="hh-check-in-footer shrink-0 border-t border-hilda-border/10 bg-hilda-bg pt-2">
        {footer}
      </div>
    </div>
  );
}
