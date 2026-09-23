"use client";

import { useEffect } from "react";

/** Smooth-scroll to a plant section when arriving via ?plant= legacy redirect. */
export function CareCardPlantScroll({ plantId }: { plantId?: string }) {
  useEffect(() => {
    if (!plantId) return;
    const el = document.getElementById(`plant-${plantId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [plantId]);

  return null;
}
