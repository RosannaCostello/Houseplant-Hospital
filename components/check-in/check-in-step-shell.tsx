"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { bindKeyboardAvoidance } from "@/lib/ui/keyboard-avoidance";
import { cn } from "@/lib/utils";

type CheckInStepShellProps = {
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  status?: ReactNode;
  maxWidth?: "2xl" | "3xl";
};

/**
 * Check-in layout with sticky footer that lifts above the iPad software keyboard
 * via visualViewport (HIL-110).
 */
export function CheckInStepShell({
  header,
  children,
  footer,
  status,
  maxWidth = "2xl",
}: CheckInStepShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    return bindKeyboardAvoidance(rootRef.current);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function updateInset() {
      if (!vv) return;
      // Space covered by the software keyboard (layout viewport minus visual).
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset);
    }

    updateInset();
    vv.addEventListener("resize", updateInset);
    vv.addEventListener("scroll", updateInset);
    window.addEventListener("resize", updateInset);
    return () => {
      vv.removeEventListener("resize", updateInset);
      vv.removeEventListener("scroll", updateInset);
      window.removeEventListener("resize", updateInset);
    };
  }, []);

  const footerStyle: CSSProperties | undefined =
    keyboardInset > 0
      ? {
          // Stay above keyboard; drop bottom-nav padding while keyboard is up.
          paddingBottom: `calc(${keyboardInset}px + 0.75rem)`,
          marginBottom: `calc(-1 * var(--bottom-nav-inset))`,
        }
      : undefined;

  return (
    <div
      ref={rootRef}
      className={cn(
        "mx-auto flex h-full min-h-0 w-full flex-col pb-[var(--bottom-nav-inset)]",
        maxWidth === "3xl" ? "max-w-3xl" : "max-w-2xl",
      )}
    >
      <div className="shrink-0">{header}</div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">{children}</div>

      {status ? <div className="shrink-0 space-y-1 pt-2">{status}</div> : null}

      <div
        className="shrink-0 border-t border-hilda-border/10 bg-hilda-bg pt-3 transition-[padding] duration-150"
        style={footerStyle}
      >
        {footer}
      </div>
    </div>
  );
}
