"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { lockBodyScroll } from "@/lib/ui/body-scroll-lock";
import { STAFF_OVERLAY_Z } from "@/lib/ui/overlay-z";
import { cn } from "@/lib/utils";

/**
 * Shopify POS Universal Link (apple-app-site-association → /install/pos).
 * From another domain (Hospital), Safari hands off to the installed POS app.
 */
const SHOPIFY_POS_URL = "https://www.shopify.com/install/pos";
const SHOPIFY_POS_ICON_SRC =
  "https://cdn.shopify.com/app-store/listing_images/a53cf2ce9b5dabf5dd222b3615c29569/icon/CPXdk7L0lu8CEAE=.png";

export type OpenShopifyPosDialogProps = {
  open: boolean;
  onDismiss: () => void;
};

export function OpenShopifyPosDialog({ open, onDismiss }: OpenShopifyPosDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    dismissRef.current?.focus();
    const unlock = lockBodyScroll();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlock();
    };
  }, [open, onDismiss]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("fixed inset-0 flex items-center justify-center p-4", STAFF_OVERLAY_Z)}>
      <button
        type="button"
        className="absolute inset-0 bg-hilda-heading/40"
        aria-label="Stay on this page"
        onClick={onDismiss}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-hilda border border-hilda-border/15 bg-hilda-surface shadow-xl"
      >
        <div className="border-b border-hilda-border/10 px-4 py-3">
          <h2 id={titleId} className="font-serif text-lg font-normal text-hilda-heading">
            Open Shopify POS
          </h2>
          <p id={descriptionId} className="mt-2 text-sm text-hilda-text">
            Tap the logo to open Shopify POS. Then tap the{" "}
            <strong className="font-semibold text-hilda-heading">Houseplant Hospital</strong> tile,
            load this check-in, and take payment.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 px-4 py-5">
          <a
            href={SHOPIFY_POS_URL}
            className="group flex flex-col items-center gap-2 rounded-hilda focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hilda-heading"
            aria-label="Open Shopify POS"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- CDN app icon; avoid Image optimizer for tap target */}
            <img
              src={SHOPIFY_POS_ICON_SRC}
              alt=""
              width={96}
              height={96}
              className="h-24 w-24 rounded-[22%] bg-[#95BF47] shadow-md transition-transform group-active:scale-95"
              draggable={false}
            />
            <span className="text-sm font-medium text-hilda-heading underline-offset-2 group-hover:underline">
              Open Shopify POS
            </span>
          </a>
        </div>

        <div className="p-4 pt-0">
          <Button
            ref={dismissRef}
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            onClick={onDismiss}
          >
            Stay on this page
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
