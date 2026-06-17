import Image from "next/image";
import Link from "next/link";
import { formatPlantAge } from "@/lib/format-plant-age";
import type { DashboardPlant } from "@/lib/dashboard/types";
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
        sizes="14rem"
        className="object-cover"
        unoptimized
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-100 text-zinc-400">
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
    <Link
      href={`/app/plants/${plant.id}`}
      className={cn(
        "block overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50",
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-zinc-100 bg-zinc-50">
        <PlantThumbnail thumbnailUrl={plant.thumbnailUrl} />
        {plant.bugsFound ? (
          <span className="absolute right-2 top-2 rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Bugs
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5 p-2.5">
        <p className="truncate text-sm font-semibold text-zinc-900">{plant.customerSurname}</p>
        <div>
          <p className="truncate text-sm text-zinc-800">{plantDisplayName(plant)}</p>
          {subtitle ? <p className="truncate text-xs text-zinc-500">{subtitle}</p> : null}
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
            {plant.size}
          </span>
          <span className="text-[11px] text-zinc-500">{formatPlantAge(plant.checkedInAt)}</span>
        </div>
      </div>
    </Link>
  );
}
