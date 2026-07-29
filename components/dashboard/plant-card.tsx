"use client";

import Image from "next/image";
import { PlantCardStatusMenu } from "@/components/dashboard/plant-card-status-menu";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { BugsFoundBadge } from "@/components/plants/bugs-found-badge";
import { PropagationBadge } from "@/components/plants/propagation-badge";
import { formatDaysSinceCheckIn, formatPlantAge } from "@/lib/format-plant-age";
import { formatCollectedBadgeLabel } from "@/lib/format-collected-date";
import {
  formatDaysInQuarantine,
} from "@/lib/format-quarantine-age";
import type { DashboardPlant } from "@/lib/dashboard/types";
import { formatVisitPlantPosition } from "@/lib/visits/visit-plant-position";
import { cn } from "@/lib/utils";

type PlantCardProps = {
  plant: DashboardPlant;
  className?: string;
};

const imageOverlayBadgeClass =
  "inline-flex h-5 shrink-0 items-center justify-center rounded-hilda-sm px-1.5 shadow-sm";

function PlantThumbnail({ thumbnailUrl }: { thumbnailUrl?: string | null }) {
  if (thumbnailUrl?.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URLs are not supported by next/image here.
      <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
    );
  }

  if (thumbnailUrl) {
    return (
      <Image
        src={thumbnailUrl}
        alt=""
        fill
        sizes="18rem"
        className="object-cover"
        unoptimized
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-hilda-bg text-hilda-text-muted">
      <svg
        aria-hidden
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 3c-1.5 2.5-4 4.2-4 7.5a4 4 0 1 0 8 0c0-3.3-2.5-5-4-7.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12 14v7" strokeLinecap="round" />
        <path d="M9 21h6" strokeLinecap="round" />
      </svg>
      <span className="text-[10px] font-medium uppercase tracking-wide">No photo</span>
    </div>
  );
}

const CARD_IMAGE_ASPECT_CLASS = "aspect-[4/3]";

const footerStatusClass = "text-[11px] text-hilda-text";

export function PlantCard({ plant, className }: PlantCardProps) {
  const showQuarantineBadge = plant.status === "quarantine" && plant.quarantineSince;
  const showCheckInBadge = plant.status === "check_in";
  const showPropagationAge = plant.status === "propagation";
  const showOutpatientBadge = plant.status === "outpatient" && plant.outpatientCollectionBadge;
  const showCollectedBadge = plant.status === "collected";
  const showFooterBadge =
    showQuarantineBadge ||
    showCheckInBadge ||
    showPropagationAge ||
    showOutpatientBadge ||
    showCollectedBadge;
  const showPlantAge = !showCheckInBadge && !showPropagationAge && !showCollectedBadge;

  return (
    <div className={cn("relative rounded-hilda hilda-card-shadow", className)}>
      <article className="flex w-full flex-col overflow-hidden rounded-hilda bg-hilda-surface">
        <div
          className={cn(
            "relative block w-full shrink-0 overflow-hidden bg-hilda-bg",
            CARD_IMAGE_ASPECT_CLASS,
          )}
        >
          <PlantThumbnail thumbnailUrl={plant.thumbnailUrl} />
          <div className="absolute left-2 top-1.5 flex items-center gap-1.5">
            <span
              className={cn(
                imageOverlayBadgeClass,
                "bg-hilda-surface text-[11px] font-semibold uppercase tracking-wide text-hilda-heading",
              )}
            >
              {plant.size}
            </span>
            {plant.plantCategory === "propagation" ? <PropagationBadge /> : null}
            {plant.bugsFound ? (
              <BugsFoundBadge
                className={cn(imageOverlayBadgeClass, "bg-hilda-bugs py-0")}
                iconClassName="h-3 w-3"
              />
            ) : null}
            <PaymentStatusBadge
              status={plant.paymentStatus}
              shopifyOrderId={plant.shopifyOrderId}
              compact
              className="shadow-sm"
            />
          </div>
        </div>

        <div className="shrink-0">
          <div className="block space-y-1 p-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-medium text-hilda-heading">{plant.customerName}</p>
              <span className="shrink-0 tabular-nums text-[11px] font-semibold text-hilda-text-muted">
                {formatVisitPlantPosition(plant.visitPlantIndex, plant.visitPlantTotal)}
              </span>
            </div>

            <div
              className={cn(
                "flex items-center gap-2",
                showFooterBadge ? "justify-between" : "justify-end",
              )}
            >
              {showQuarantineBadge ? (
                <span className={footerStatusClass}>
                  {formatDaysInQuarantine(plant.quarantineSince!)}
                </span>
              ) : showCheckInBadge ? (
                <span className={footerStatusClass}>
                  {formatDaysSinceCheckIn(plant.checkedInAt)}
                </span>
              ) : showPropagationAge ? (
                <span className={footerStatusClass}>
                  {formatPlantAge(plant.checkedInAt)} in propagation
                </span>
              ) : showOutpatientBadge ? (
                <span className={footerStatusClass}>{plant.outpatientCollectionBadge}</span>
              ) : showCollectedBadge ? (
                <span className={footerStatusClass}>
                  {plant.collectedAt ? formatCollectedBadgeLabel(plant.collectedAt) : "Collected"}
                </span>
              ) : null}
              {showPlantAge ? (
                <span className="text-[11px] text-hilda-text-muted">{formatPlantAge(plant.checkedInAt)}</span>
              ) : null}
            </div>
          </div>
        </div>
      </article>
      <PlantCardStatusMenu
        plantId={plant.id}
        currentStatus={plant.status}
        size={plant.size}
        bugsFound={plant.bugsFound}
        plantCategory={plant.plantCategory}
        hasPropagation={plant.hasPropagation}
        customerName={plant.customerName}
        paymentStatus={plant.paymentStatus}
      />
    </div>
  );
}
