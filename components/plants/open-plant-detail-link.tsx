"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useOptionalPlantDetailModal } from "@/components/plants/plant-detail-modal";
import { cn } from "@/lib/utils";

type OpenPlantDetailLinkProps = {
  plantId: string;
  className?: string;
  children: ReactNode;
};

/** Opens plant detail modal when provider is available; otherwise navigates to the page. */
export function OpenPlantDetailLink({ plantId, className, children }: OpenPlantDetailLinkProps) {
  const modal = useOptionalPlantDetailModal();
  const href = `/app/plants/${plantId}`;

  if (!modal) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cn("text-left", className)}
      onClick={() => modal.openPlantDetail(plantId)}
    >
      {children}
    </button>
  );
}
