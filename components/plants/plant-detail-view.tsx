import Image from "next/image";
import Link from "next/link";
import { BugsFoundBadge } from "@/components/plants/bugs-found-badge";
import { BugsFoundToggle } from "@/components/plants/bugs-found-toggle";
import { CareTipsSection } from "@/components/plants/care-tips-section";
import { PlantCaseLink } from "@/components/plants/plant-case-link";
import { PricingSummarySection } from "@/components/plants/pricing-summary-section";
import { TreatmentNotesSection } from "@/components/plants/treatment-notes-section";
import { Button } from "@/components/ui/button";
import { formatPlantAge } from "@/lib/format-plant-age";
import type { PlantDetail } from "@/lib/plants/get-plant-detail";
import { plantStatusLabel } from "@/lib/plant-status";
import type { PlantPriceBreakdown } from "@/lib/pricing/types";
import { formatVisitPlantPosition } from "@/lib/visits/visit-plant-position";

type PlantDetailViewProps = {
  plant: PlantDetail;
  pricing: PlantPriceBreakdown | null;
};

function plantSubtitle(plant: PlantDetail): string | null {
  const name = plant.name?.trim();
  const species = plant.species?.trim();

  if (name && species) return `${name} · ${species}`;
  if (name) return name;
  if (species) return species;
  return null;
}

export function PlantDetailView({
  plant,
  pricing,
}: PlantDetailViewProps) {
  const latestPhoto = plant.photos[0] ?? null;
  const isCollected = plant.status === "collected";
  const subtitle = plantSubtitle(plant);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-3 pb-[var(--bottom-nav-inset)]">
      {subtitle ? <p className="truncate text-sm text-hilda-text">{subtitle}</p> : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,42%)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-none border border-hilda-border/15 bg-hilda-surface">
          <div className="relative aspect-[4/3] max-h-[min(28dvh,11rem)] w-full bg-hilda-bg sm:max-h-[min(32dvh,12.5rem)]">
            {latestPhoto ? (
              <Image
                src={latestPhoto.url}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 20rem"
                className="object-cover"
                unoptimized
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-hilda-text-muted">No photo</div>
            )}
            {plant.bugsFound ? (
              <BugsFoundBadge className="absolute right-2 top-2 bg-hilda-bugs" />
            ) : null}
          </div>

          {plant.photos.length > 1 ? (
            <div className="flex gap-1.5 overflow-x-auto border-t border-hilda-border/10 p-2">
              {plant.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative h-12 w-14 shrink-0 overflow-hidden rounded-none border border-hilda-border/15"
                >
                  <Image
                    src={photo.thumbnailUrl ?? photo.url}
                    alt=""
                    fill
                    sizes="3.5rem"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <div className="rounded-none border border-hilda-border/15 bg-hilda-surface p-3">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">Status</dt>
              <dd className="mt-0.5 font-medium text-hilda-heading">{plantStatusLabel(plant.status)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">Size</dt>
              <dd className="mt-0.5 font-medium text-hilda-heading">{plant.size}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">Customer</dt>
              <dd className="mt-0.5 text-hilda-heading">
                {plant.customer.firstName} {plant.customer.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">Check-in</dt>
              <dd className="mt-0.5 text-hilda-heading">
                {new Date(plant.checkedInAt).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                <span className="text-hilda-text-muted">({formatPlantAge(plant.checkedInAt)})</span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">Contact</dt>
              <dd className="mt-0.5 text-hilda-heading">
                <a className="hover:underline" href={`mailto:${plant.customer.email}`}>
                  {plant.customer.email}
                </a>
                {plant.customer.phone ? (
                  <span className="text-hilda-text">
                    {" "}
                    ·{" "}
                    <a className="hover:underline" href={`tel:${plant.customer.phone}`}>
                      {plant.customer.phone}
                    </a>
                  </span>
                ) : null}
              </dd>
            </div>
            {plant.visitNotes ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">Notes</dt>
                <dd className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-hilda-heading">{plant.visitNotes}</dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">
                Plants in visit
              </dt>
              <dd className="mt-0.5 font-medium tabular-nums text-hilda-heading">
                {plant.visitPlantTotal}
                {plant.visitPlantTotal > 1 ? (
                  <span className="font-normal text-hilda-text">
                    {" "}
                    · {formatVisitPlantPosition(plant.visitPlantIndex, plant.visitPlantTotal)}
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>

          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href={`/app/visits/${plant.visitId}`}>View visit</Link>
          </Button>
        </div>
      </div>

      <section className="rounded-none border border-hilda-border/15 bg-hilda-surface p-3">
        <BugsFoundToggle
          plantId={plant.id}
          bugsFound={plant.bugsFound}
          disabled={isCollected}
        />
      </section>

      <TreatmentNotesSection plantId={plant.id} treatmentNote={plant.treatmentNote} compact />

      <CareTipsSection plantId={plant.id} careTip={plant.careTip} compact />

      <PricingSummarySection
        pricing={pricing}
        bugsFound={plant.bugsFound}
        isCollected={isCollected}
        finalPrice={plant.finalPrice}
        compact
      />

      <PlantCaseLink
        plantId={plant.id}
        className="inline-flex min-h-10 w-full items-center justify-center rounded-none border border-hilda-border/25 bg-hilda-surface px-3 py-2 text-sm font-medium text-hilda-heading hover:bg-hilda-bg sm:w-auto"
      />
    </div>
  );
}
