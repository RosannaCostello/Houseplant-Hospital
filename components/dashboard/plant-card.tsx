"use client";

import Image from "next/image";
import Link from "next/link";
import { PlantCardStatusMenu } from "@/components/dashboard/plant-card-status-menu";
import { BugsFoundBadge } from "@/components/plants/bugs-found-badge";
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
  "inline-flex h-5 shrink-0 items-center justify-center rounded-none px-1.5 shadow-sm";

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
        className="h-8 w-8"
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

export function PlantCard({ plant, className }: PlantCardProps) {
  const showQuarantineBadge = plant.status === "quarantine" && plant.quarantineSince;
  const showCheckInBadge = plant.status === "check_in";
  const showOutpatientBadge = plant.status === "outpatient" && plant.outpatientCollectionBadge;
  const showCollectedBadge = plant.status === "collected";
  const showFooterBadge =
    showQuarantineBadge || showCheckInBadge || showOutpatientBadge || showCollectedBadge;
  const showPlantAge = !showCheckInBadge && !showCollectedBadge;

  return (
    <article
      className={cn(
        "shrink-0 overflow-hidden rounded-none border border-hilda-border/15 bg-hilda-surface shadow-sm",
        className,
      )}
    >
      <Link
        href={`/app/plants/${plant.id}`}
        className="block transition-colors hover:bg-hilda-bg"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-hilda-border/10 bg-hilda-bg">
          <PlantThumbnail thumbnailUrl={plant.thumbnailUrl} />
          <div className="absolute left-2 top-2 flex items-center gap-1.5">
            <span
              className={cn(
                imageOverlayBadgeClass,
                "bg-hilda-surface text-[11px] font-semibold uppercase tracking-wide text-hilda-heading",
              )}
            >
              {plant.size}
            </span>
            {plant.bugsFound ? (
              <BugsFoundBadge
                className={cn(imageOverlayBadgeClass, "bg-hilda-bugs py-0")}
                iconClassName="h-3 w-3"
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5 p-3">
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
              <span className="rounded-none bg-hilda-heading px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-hilda-inverse">
                {formatDaysInQuarantine(plant.quarantineSince!)}
              </span>
            ) : showCheckInBadge ? (
              <span className="rounded-none bg-hilda-gold px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-hilda-heading">
                {formatDaysSinceCheckIn(plant.checkedInAt)}
              </span>
            ) : showOutpatientBadge ? (
              <span className="rounded-none bg-hilda-text px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-hilda-inverse">
                {plant.outpatientCollectionBadge}
              </span>
            ) : showCollectedBadge ? (
              <span className="rounded-none border border-hilda-border/25 bg-hilda-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-hilda-heading">
                {plant.collectedAt ? formatCollectedBadgeLabel(plant.collectedAt) : "Collected"}
              </span>
            ) : null}
            {showPlantAge ? (
              <span className="text-[11px] text-hilda-text-muted">{formatPlantAge(plant.checkedInAt)}</span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="px-3 pb-3 pt-1.5">
        <PlantCardStatusMenu plantId={plant.id} currentStatus={plant.status} />
      </div>
    </article>
  );
}
