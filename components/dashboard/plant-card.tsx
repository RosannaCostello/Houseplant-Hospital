import Image from "next/image";
import Link from "next/link";
import { PlantCardStatusMenu } from "@/components/dashboard/plant-card-status-menu";
import { BugsFoundBadge } from "@/components/plants/bugs-found-badge";
import { formatPlantAge } from "@/lib/format-plant-age";
import {
  formatDaysInQuarantine,
  formatQuarantineBadgeDays,
} from "@/lib/format-quarantine-age";
import type { DashboardPlant } from "@/lib/dashboard/types";
import { formatVisitPlantPosition } from "@/lib/visits/visit-plant-position";
import { cn } from "@/lib/utils";

type PlantCardProps = {
  plant: DashboardPlant;
  className?: string;
};

function plantDisplayName(plant: DashboardPlant): string {
  if (plant.name?.trim()) return plant.name.trim();
  if (plant.species?.trim()) return plant.species.trim();
  return "Unnamed plant";
}

function plantSubtitle(plant: DashboardPlant): string | null {
  if (plant.name?.trim() && plant.species?.trim()) return plant.species.trim();
  return null;
}

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
  const subtitle = plantSubtitle(plant);

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
          {plant.status === "quarantine" && plant.quarantineSince ? (
            <span
              className="absolute left-2 top-2 flex flex-col rounded-none bg-hilda-deep px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-tight tracking-wide text-white"
              title={formatDaysInQuarantine(plant.quarantineSince)}
            >
              <span>{formatQuarantineBadgeDays(plant.quarantineSince)}</span>
              <span className="text-[9px] font-medium normal-case tracking-normal opacity-90">
                in quarantine
              </span>
            </span>
          ) : null}
          {plant.bugsFound ? (
            <BugsFoundBadge className="right-2 top-2 bg-hilda-gold" />
          ) : null}
        </div>

        <div className="space-y-1.5 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-medium text-hilda-heading">{plant.customerSurname}</p>
            <span className="shrink-0 tabular-nums text-[11px] font-semibold text-hilda-text-muted">
              {formatVisitPlantPosition(plant.visitPlantIndex, plant.visitPlantTotal)}
            </span>
          </div>
          <div>
            <p className="line-clamp-2 text-sm leading-snug text-hilda-text">{plantDisplayName(plant)}</p>
            {subtitle ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-hilda-text-muted">{subtitle}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="rounded bg-hilda-bg px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-hilda-heading">
              {plant.size}
            </span>
            <span className="text-[11px] text-hilda-text-muted">{formatPlantAge(plant.checkedInAt)}</span>
          </div>
        </div>
      </Link>

      <div className="border-t border-hilda-border/10 px-3 pb-3 pt-1.5">
        <PlantCardStatusMenu plantId={plant.id} currentStatus={plant.status} />
      </div>
    </article>
  );
}
