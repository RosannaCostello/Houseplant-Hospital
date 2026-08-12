"use client";

import { useRouter } from "next/navigation";
import { PlantCardStatusMenu } from "@/components/dashboard/plant-card-status-menu";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { BugsFoundToggle } from "@/components/plants/bugs-found-toggle";
import { CareTipsSection } from "@/components/plants/care-tips-section";
import { InternalNotesSection } from "@/components/plants/internal-notes-section";
import { PlantCaseLink } from "@/components/plants/plant-case-link";
import { PestTreatmentsSection } from "@/components/plants/pest-treatments-section";
import { useOptionalPlantDetailModal } from "@/components/plants/plant-detail-modal";
import { PlantIdentityFields } from "@/components/plants/plant-identity-fields";
import { PlantPhotoGallery } from "@/components/plants/plant-photo-gallery";
import { PricingSummarySection } from "@/components/plants/pricing-summary-section";
import { TreatmentNotesSection } from "@/components/plants/treatment-notes-section";
import { PropagatePlantButton } from "@/components/plants/propagate-plant-button";
import { PrintPlantLabelButton } from "@/components/plants/print-plant-label-button";
import { Button } from "@/components/ui/button";
import { formatPlantAge } from "@/lib/format-plant-age";
import type { PlantDetail } from "@/lib/plants/get-plant-detail";
import { formatMinutesInSurgery } from "@/lib/plants/get-minutes-in-surgery";
import { plantStatusLabel } from "@/lib/plant-status";
import { formatPlantSizeLabel } from "@/lib/plant-size";
import type { PlantPriceBreakdown } from "@/lib/pricing/types";
import { formatVisitPlantPosition } from "@/lib/visits/visit-plant-position";
import type { CareTipOptionsByCategory } from "@/lib/care-tips/types";
import type { PestTreatmentOption } from "@/lib/pest-treatments/types";

type PlantDetailViewProps = {
  plant: PlantDetail;
  pricing: PlantPriceBreakdown | null;
  careTipOptions: CareTipOptionsByCategory;
  pestTreatmentOptions: PestTreatmentOption[];
  treatmentNotesPlaceholder: string;
  /** When true, omit page bottom-nav padding (modal overlay). */
  embeddedInModal?: boolean;
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
  pestTreatmentOptions,
  treatmentNotesPlaceholder,
  embeddedInModal = false,
}: PlantDetailViewProps) {
  const router = useRouter();
  const plantDetailModal = useOptionalPlantDetailModal();
  const isCollected = plant.status === "collected";
  const subtitle = isCollected ? plantSubtitle(plant) : null;
  const isPropagation = plant.plantCategory === "propagation";
  const isOutpatient = plant.status === "outpatient";
  const showPropagate = plant.status === "in_surgery" && !isPropagation;
  const showPestTreatments =
    plant.bugsFound === true ||
    (plant.bugsFoundEver && plant.bugsFound !== false) ||
    (plant.pestTreatments.length > 0 && plant.bugsFound !== false);
  const propagateDisabledReason = plant.hasPropagation
    ? "This plant has already been propagated."
    : plant.bugsFound !== false
      ? "Plants with pests cannot be propagated."
      : undefined;

  function onViewDropOff() {
    plantDetailModal?.closePlantDetail();
    router.push(`/app/visits/${plant.visitId}`);
  }

  const treatmentNotes = isOutpatient ? (
    <section className="space-y-3 rounded-hilda border border-hilda-warning-border bg-hilda-warning-bg p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-warning-text">
        Treatment notes
      </h2>
      <TreatmentNotesSection
        plantId={plant.id}
        treatmentNote={plant.treatmentNote}
        placeholder={treatmentNotesPlaceholder}
        compact
        embedded
        readOnly={isCollected}
      />
    </section>
  ) : (
    <TreatmentNotesSection
      plantId={plant.id}
      treatmentNote={plant.treatmentNote}
      placeholder={treatmentNotesPlaceholder}
      compact
      readOnly={isCollected}
    />
  );

  return (
    <div
      className={
        embeddedInModal
          ? "mx-auto w-full max-w-4xl space-y-3"
          : "mx-auto w-full max-w-4xl space-y-3 pb-[var(--bottom-nav-inset)]"
      }
    >
      {subtitle ? <p className="truncate text-sm text-hilda-text">{subtitle}</p> : null}

      {!isCollected ? (
        <PlantIdentityFields
          plantId={plant.id}
          initialName={plant.name}
          initialSpecies={plant.species}
        />
      ) : null}

      {isOutpatient ? treatmentNotes : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,42%)_minmax(0,1fr)]">
        <PlantPhotoGallery
          plantId={plant.id}
          photos={plant.photos}
          bugsFound={plant.bugsFound}
          isPropagation={isPropagation}
          canRetake={!isCollected}
        />

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
              <dd className="mt-0.5 font-medium text-hilda-heading">{formatPlantSizeLabel(plant.size)}</dd>
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
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">
                Plants in drop-off
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
            {plant.status === "outpatient" || plant.status === "collected" ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">
                  Time in Surgery
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums text-hilda-heading">
                  {formatMinutesInSurgery(plant.minutesInSurgery)}
                </dd>
              </div>
            ) : null}
          </dl>

          <Button type="button" variant="outline" className="mt-3 w-full" onClick={onViewDropOff}>
            View drop-off
          </Button>
          {!isCollected ? (
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
          ) : null}
        </div>
      </div>

      <InternalNotesSection
        plantId={plant.id}
        internalNotes={plant.internalNotes}
        readOnly={isCollected}
      />

      {showPropagate ? (
        <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
          <PropagatePlantButton
            plantId={plant.id}
            initialSize={plant.size}
            disabledReason={propagateDisabledReason}
          />
        </section>
      ) : null}

      {showPestTreatments ? (
        <PestTreatmentsSection
          plantId={plant.id}
          treatments={plant.pestTreatments}
          options={pestTreatmentOptions}
          disabled={isCollected}
        />
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

      {!isOutpatient ? treatmentNotes : null}

      <CareTipsSection
        plantId={plant.id}
        careTip={plant.careTip}
        optionsByCategory={careTipOptions}
        compact
        readOnly={isCollected}
      />

      <PricingSummarySection
        pricing={pricing}
        bugsFound={plant.bugsFound}
        isCollected={isCollected}
        finalPrice={plant.finalPrice}
        compact
      />

      <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
          Print
        </h2>
        <PrintPlantLabelButton plantId={plant.id} disabled={isCollected} />
      </section>

      <div className="flex items-center justify-between gap-3">
        <PlantCaseLink
          plantId={plant.id}
          className="inline-flex min-h-10 items-center justify-center rounded-hilda-sm border border-hilda-border/25 bg-hilda-surface px-3 py-2 text-sm font-medium text-hilda-heading hover:bg-hilda-bg"
        />
        {!isCollected ? (
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
        ) : (
          <p className="text-sm text-hilda-text-muted">Collected — view only</p>
        )}
      </div>
    </div>
  );
}
