"use client";

import { useCallback, useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

type AnchoredPortalProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  /** Extra space below the anchor before the portal starts. */
  offsetPx?: number;
  className?: string;
  maxHeightPx?: number;
};

/**
 * Portals a list into document.body, positioned under an anchor and kept inside
 * the visualViewport so iPad keyboards don't clip autocomplete (HIL-110).
 */
export function AnchoredPortal({
  open,
  anchorRef,
  children,
  offsetPx = 4,
  className,
  maxHeightPx = 240,
}: AnchoredPortalProps) {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor || typeof window === "undefined") {
      setStyle(null);
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const vv = window.visualViewport;
    const viewTop = vv?.offsetTop ?? 0;
    const viewBottom = viewTop + (vv?.height ?? window.innerHeight);
    const viewLeft = vv?.offsetLeft ?? 0;
    const viewRight = viewLeft + (vv?.width ?? window.innerWidth);

    const left = Math.max(viewLeft + 8, Math.min(rect.left, viewRight - Math.min(rect.width, viewRight - viewLeft - 16)));
    const width = Math.min(rect.width, viewRight - left - 8);
    const topBelow = rect.bottom + offsetPx;
    const spaceBelow = viewBottom - topBelow - 8;
    const spaceAbove = rect.top - viewTop - 8;
    const placeAbove = spaceBelow < 120 && spaceAbove > spaceBelow;
    const maxH = Math.min(maxHeightPx, Math.max(96, placeAbove ? spaceAbove : spaceBelow));

    if (placeAbove) {
      setStyle({
        position: "fixed",
        left,
        width,
        bottom: window.innerHeight - rect.top + offsetPx,
        maxHeight: maxH,
        zIndex: 140,
      });
      return;
    }

    setStyle({
      position: "fixed",
      left,
      width,
      top: topBelow,
      maxHeight: maxH,
      zIndex: 140,
    });
  }, [anchorRef, maxHeightPx, offsetPx]);

  useLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return;
    }

    update();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  if (!open || !style || typeof document === "undefined") return null;

  return createPortal(
    <div className={className} style={style}>
      {children}
    </div>,
    document.body,
  );
}
