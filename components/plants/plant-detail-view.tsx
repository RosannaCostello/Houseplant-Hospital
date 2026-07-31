import Image from "next/image";
import Link from "next/link";
import { PlantCardStatusMenu } from "@/components/dashboard/plant-card-status-menu";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { BugsFoundBadge } from "@/components/plants/bugs-found-badge";
import { BugsFoundToggle } from "@/components/plants/bugs-found-toggle";
import { CareTipsSection } from "@/components/plants/care-tips-section";
import { PlantCaseLink } from "@/components/plants/plant-case-link";
import { PricingSummarySection } from "@/components/plants/pricing-summary-section";
import { TreatmentNotesSection } from "@/components/plants/treatment-notes-section";
import { PropagationBadge } from "@/components/plants/propagation-badge";
import { PropagatePlantButton } from "@/components/plants/propagate-plant-button";
import { Button } from "@/components/ui/button";
import { formatPlantAge } from "@/lib/format-plant-age";
import type { PlantDetail } from "@/lib/plants/get-plant-detail";
import { plantStatusLabel } from "@/lib/plant-status";
import type { PlantPriceBreakdown } from "@/lib/pricing/types";
import { formatVisitPlantPosition } from "@/lib/visits/visit-plant-position";
import type { CareTipOptionsByCategory } from "@/lib/care-tips/types";

type PlantDetailViewProps = {
  plant: PlantDetail;
  pricing: PlantPriceBreakdown | null;
  careTipOptions: CareTipOptionsByCategory;
  treatmentNotesPlaceholder: string;
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
  careTipOptions,
  treatmentNotesPlaceholder,
}: PlantDetailViewProps) {
  const latestPhoto = plant.photos[0] ?? null;
  const isCollected = plant.status === "collected";
  const subtitle = plantSubtitle(plant);
  const isPropagation = plant.plantCategory === "propagation";
  const showPropagate = plant.status === "in_surgery" && !isPropagation;
  const propagateDisabledReason = plant.hasPropagation
    ? "This plant has already been propagated."
    : plant.bugsFound !== false
      ? "Plants with pests cannot be propagated."
      : undefined;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-3 pb-[var(--bottom-nav-inset)]">
      {subtitle ? <p className="truncate text-sm text-hilda-text">{subtitle}</p> : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,42%)_minmax(0,1fr)]">
        <section className="flex flex-col overflow-hidden rounded-hilda border border-hilda-border/15 bg-hilda-surface">
          <div className="relative aspect-[4/3] w-full flex-1 bg-hilda-bg sm:aspect-auto sm:min-h-[12.5rem]">
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
            {isPropagation ? <PropagationBadge className="absolute left-2 top-2" /> : null}
          </div>

          {plant.photos.length > 1 ? (
            <div className="flex gap-1.5 overflow-x-auto border-t border-hilda-border/10 p-2">
              {plant.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative h-12 w-14 shrink-0 overflow-hidden rounded-hilda-sm border border-hilda-border/15"
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

        <div className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">Status</dt>
              <dd className="mt-0.5 font-medium text-hilda-heading">{plantStatusLabel(plant.status)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">
                {isPropagation ? "Plant propagation size" : "Size"}
              </dt>
              <dd className="mt-0.5 font-medium text-hilda-heading">{plant.size}</dd>
            </div>
            {isPropagation ? (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">
                  Category
                </dt>
                <dd className="mt-0.5 font-medium text-hilda-heading">Propagation</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">Payment</dt>
              <dd className="mt-1">
                <PaymentStatusBadge
                  status={plant.paymentStatus}
                  shopifyOrderId={plant.shopifyOrderId}
                />
              </dd>
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
          <PlantCardStatusMenu
            plantId={plant.id}
            currentStatus={plant.status}
            size={plant.size}
            bugsFound={plant.bugsFound}
            plantCategory={plant.plantCategory}
            hasPropagation={plant.hasPropagation}
            customerName={`${plant.customer.firstName} ${plant.customer.lastName}`.trim()}
            paymentStatus={plant.paymentStatus}
            variant="button"
            hideUpdatePlantLink
            className="mt-2 block w-full [&_button]:w-full"
          />
        </div>
      </div>

      {showPropagate ? (
        <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
          <PropagatePlantButton
            plantId={plant.id}
            initialSize={plant.size}
            disabledReason={propagateDisabledReason}
          />
        </section>
      ) : null}

      {!isPropagation ? (
        <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
          <BugsFoundToggle
            plantId={plant.id}
            bugsFound={plant.bugsFound}
            disabled={isCollected}
          />
        </section>
      ) : null}

      <TreatmentNotesSection
        plantId={plant.id}
        treatmentNote={plant.treatmentNote}
        placeholder={treatmentNotesPlaceholder}
        compact
      />

      <CareTipsSection
        plantId={plant.id}
        careTip={plant.careTip}
        optionsByCategory={careTipOptions}
        compact
      />

      <PricingSummarySection
        pricing={pricing}
        bugsFound={plant.bugsFound}
        isCollected={isCollected}
        finalPrice={plant.finalPrice}
        compact
      />

      <div className="flex items-center justify-between gap-3">
        <PlantCaseLink
          plantId={plant.id}
          className="inline-flex min-h-10 items-center justify-center rounded-hilda-sm border border-hilda-border/25 bg-hilda-surface px-3 py-2 text-sm font-medium text-hilda-heading hover:bg-hilda-bg"
        />
        <PlantCardStatusMenu
          plantId={plant.id}
          currentStatus={plant.status}
          size={plant.size}
          bugsFound={plant.bugsFound}
          plantCategory={plant.plantCategory}
          hasPropagation={plant.hasPropagation}
          customerName={`${plant.customer.firstName} ${plant.customer.lastName}`.trim()}
          paymentStatus={plant.paymentStatus}
          variant="button"
          hideUpdatePlantLink
        />
      </div>
    </div>
  );
}
