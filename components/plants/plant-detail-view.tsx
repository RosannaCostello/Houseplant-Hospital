"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlantCardStatusMenu } from "@/components/dashboard/plant-card-status-menu";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { PestsFoundAfterPaymentAlert } from "@/components/payments/pests-found-after-payment-alert";
import { BugsFoundToggle } from "@/components/plants/bugs-found-toggle";
import { CareTipsSection } from "@/components/plants/care-tips-section";
import { InternalNotesSection } from "@/components/plants/internal-notes-section";
import { PlantCaseLink } from "@/components/plants/plant-case-link";
import { PestTreatmentsSection } from "@/components/plants/pest-treatments-section";
import { OutpatientZoneField } from "@/components/plants/outpatient-zone-field";
import { PestTypeField } from "@/components/plants/pest-type-field";
import { useOptionalPlantDetailModal } from "@/components/plants/plant-detail-modal";
import { PlantIdentityFields } from "@/components/plants/plant-identity-fields";
import { PlantPhotoGallery } from "@/components/plants/plant-photo-gallery";
import { PricingSummarySection } from "@/components/plants/pricing-summary-section";
import { TreatmentNotesSection } from "@/components/plants/treatment-notes-section";
import { PropagatePlantButton } from "@/components/plants/propagate-plant-button";
import { SurgerySignOffField } from "@/components/plants/surgery-sign-off-field";
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
import type { OutpatientZoneOption } from "@/lib/outpatient-zones/types";
import type { PestTreatmentOption } from "@/lib/pest-treatments/types";
import type { PestTypeOption } from "@/lib/pest-types/types";
import {
  type OutpatientReadinessMissing,
} from "@/lib/plants/outpatient-readiness";
import { formatPlantMilestoneDate } from "@/lib/plants/get-plant-milestone-dates";
import type { HospitalStaff } from "@/lib/staff/types";
import { FIELD_HIGHLIGHT_CLASS } from "@/lib/ui/field-highlight";
import { cn } from "@/lib/utils";

type PlantDetailViewProps = {
  plant: PlantDetail;
  pricing: PlantPriceBreakdown | null;
  careTipOptions: CareTipOptionsByCategory;
  pestTreatmentOptions: PestTreatmentOption[];
  pestTypeOptions: PestTypeOption[];
  outpatientZoneOptions: OutpatientZoneOption[];
  treatmentNotesPlaceholder: string;
  hospitalStaff?: HospitalStaff[];
  /** When true, omit page bottom-nav padding (modal overlay). */
  embeddedInModal?: boolean;
  /** Temporary red outlines from a blocked Outpatient move. */
  initialReadinessMissing?: OutpatientReadinessMissing[];
  initialReadinessMessage?: string | null;
};

function formatMilestoneRow(at: string) {
  return (
    <>
      {formatPlantMilestoneDate(at)}{" "}
      <span className="text-hilda-text-muted">({formatPlantAge(at)})</span>
    </>
  );
}

function plantSubtitle(plant: PlantDetail): string | null {
  const species = plant.species?.trim();
  return species || null;
}

export function PlantDetailView({
  plant,
  pricing,
  careTipOptions,
  pestTreatmentOptions,
  pestTypeOptions,
  outpatientZoneOptions,
  treatmentNotesPlaceholder,
  hospitalStaff = [],
  embeddedInModal = false,
  initialReadinessMissing = [],
  initialReadinessMessage = null,
}: PlantDetailViewProps) {
  const router = useRouter();
  const plantDetailModal = useOptionalPlantDetailModal();
  const [bugsFound, setBugsFound] = useState(plant.bugsFound);
  const [bugsFoundEver, setBugsFoundEver] = useState(plant.bugsFoundEver);
  const [readinessMissing, setReadinessMissing] = useState<OutpatientReadinessMissing[]>(
    initialReadinessMissing,
  );
  const [readinessMessage, setReadinessMessage] = useState<string | null>(
    initialReadinessMessage,
  );
  const scrolledHighlightRef = useRef(false);
  const isCollected = plant.status === "collected";
  const subtitle = isCollected ? plantSubtitle(plant) : null;
  const isPropagation = plant.plantCategory === "propagation";
  const isOutpatient = plant.status === "outpatient";
  const showPropagate = plant.status === "in_surgery" && !isPropagation;
  const showSurgerySignOffEdit = plant.status === "in_surgery" && !isCollected;
  const showSurgerySignOffReadOnly =
    (plant.status === "outpatient" || plant.status === "collected") &&
    plant.surgeryCompletedBy != null;
  const showPestTreatments =
    bugsFound === true ||
    (bugsFoundEver && bugsFound !== false) ||
    (plant.pestTreatments.length > 0 && bugsFound !== false);
  const showPestType =
    !isPropagation &&
    (bugsFound === true ||
      (bugsFoundEver && bugsFound !== false) ||
      Boolean(plant.pestTypeOptionId));
  const propagateDisabledReason = plant.hasPropagation
    ? "This plant has already been propagated."
    : undefined;

  useEffect(() => {
    setBugsFound(plant.bugsFound);
    setBugsFoundEver(plant.bugsFoundEver);
  }, [plant.bugsFound, plant.bugsFoundEver]);

  useEffect(() => {
    setReadinessMissing(initialReadinessMissing);
    setReadinessMessage(initialReadinessMessage);
    scrolledHighlightRef.current = false;
  }, [initialReadinessMissing, initialReadinessMessage, plant.id]);

  useEffect(() => {
    if (readinessMissing.length === 0 || scrolledHighlightRef.current) return;
    const first = readinessMissing[0];
    const el = document.querySelector(`[data-readiness-field="${first}"]`);
    if (el instanceof HTMLElement) {
      scrolledHighlightRef.current = true;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [readinessMissing]);

  function clearReadinessHighlight(key: OutpatientReadinessMissing) {
    setReadinessMissing((current) => {
      const next = current.filter((item) => item !== key);
      if (next.length === 0) {
        setReadinessMessage(null);
      }
      return next;
    });
  }

  function applyOutpatientIncomplete(missing: OutpatientReadinessMissing[], message: string) {
    scrolledHighlightRef.current = false;
    setReadinessMissing(missing);
    setReadinessMessage(message);
  }

  function isHighlighted(key: OutpatientReadinessMissing): boolean {
    return readinessMissing.includes(key);
  }

  function onViewDropOff() {
    plantDetailModal?.closePlantDetail();
    router.push(`/app/visits/${plant.visitId}`);
  }

  const treatmentNotes = isOutpatient ? (
    <section
      data-readiness-field="treatment_notes"
      className={cn(
        "space-y-3 rounded-hilda border border-hilda-warning-border bg-hilda-warning-bg p-3",
        isHighlighted("treatment_notes") ? FIELD_HIGHLIGHT_CLASS : null,
      )}
    >
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
        highlighted={isHighlighted("treatment_notes")}
        onHighlightClear={() => clearReadinessHighlight("treatment_notes")}
      />
    </section>
  ) : (
    <TreatmentNotesSection
      plantId={plant.id}
      treatmentNote={plant.treatmentNote}
      placeholder={treatmentNotesPlaceholder}
      compact
      readOnly={isCollected}
      highlighted={isHighlighted("treatment_notes")}
      onHighlightClear={() => clearReadinessHighlight("treatment_notes")}
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

      {readinessMessage ? (
        <p
          className="rounded-hilda border border-hilda-error-border bg-hilda-error-bg px-3 py-2 text-sm text-hilda-error-text-strong"
          role="status"
        >
          {readinessMessage}
        </p>
      ) : null}

      {plant.paymentStatus === "part_paid" ? <PestsFoundAfterPaymentAlert /> : null}

      {!isCollected ? (
        <PlantIdentityFields
          plantId={plant.id}
          initialSpecies={plant.species}
        />
      ) : null}

      {isOutpatient ? (
        <OutpatientZoneField
          plantId={plant.id}
          options={outpatientZoneOptions}
          initialOutpatientZoneId={plant.outpatientZoneId}
          readOnly={isCollected}
        />
      ) : null}

      {isOutpatient ? treatmentNotes : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,42%)_minmax(0,1fr)]">
        <PlantPhotoGallery
          plantId={plant.id}
          photos={plant.photos}
          bugsFound={bugsFound}
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
              <dd className="mt-0.5 text-hilda-heading">{formatMilestoneRow(plant.checkedInAt)}</dd>
            </div>
            {plant.milestoneDates.quarantinedAt ? (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">
                  Date quarantined
                </dt>
                <dd className="mt-0.5 text-hilda-heading">
                  {formatMilestoneRow(plant.milestoneDates.quarantinedAt)}
                </dd>
              </div>
            ) : null}
            {plant.milestoneDates.surgeryAt ? (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">
                  Surgery date
                </dt>
                <dd className="mt-0.5 text-hilda-heading">
                  {formatMilestoneRow(plant.milestoneDates.surgeryAt)}
                </dd>
              </div>
            ) : null}
            {plant.milestoneDates.propagatedAt ? (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">
                  Date propagated
                </dt>
                <dd className="mt-0.5 text-hilda-heading">
                  {formatMilestoneRow(plant.milestoneDates.propagatedAt)}
                </dd>
              </div>
            ) : null}
            {plant.milestoneDates.outpatientAt ? (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">
                  Date moved to outpatient
                </dt>
                <dd className="mt-0.5 text-hilda-heading">
                  {formatMilestoneRow(plant.milestoneDates.outpatientAt)}
                </dd>
              </div>
            ) : null}
            {plant.milestoneDates.collectedAt ? (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-hilda-text-muted">
                  Collection date
                </dt>
                <dd className="mt-0.5 text-hilda-heading">
                  {formatMilestoneRow(plant.milestoneDates.collectedAt)}
                </dd>
              </div>
            ) : null}
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
              bugsFound={bugsFound}
              plantCategory={plant.plantCategory}
              hasPropagation={plant.hasPropagation}
              customerName={`${plant.customer.firstName} ${plant.customer.lastName}`.trim()}
              paymentStatus={plant.paymentStatus}
              variant="button"
              hideUpdatePlantLink
              className="mt-2 block w-full [&_button]:w-full"
              onOutpatientIncomplete={applyOutpatientIncomplete}
            />
          ) : null}
        </div>
      </div>

      <InternalNotesSection
        plantId={plant.id}
        internalNotes={plant.internalNotes}
        readOnly={isCollected}
      />

      {showSurgerySignOffEdit ? (
        <SurgerySignOffField
          plantId={plant.id}
          staffOptions={hospitalStaff}
          initialStaff={plant.surgeryCompletedBy}
          highlighted={isHighlighted("surgery_sign_off")}
          onHighlightClear={() => clearReadinessHighlight("surgery_sign_off")}
        />
      ) : null}

      {showSurgerySignOffReadOnly ? (
        <SurgerySignOffField
          plantId={plant.id}
          staffOptions={hospitalStaff}
          initialStaff={plant.surgeryCompletedBy}
          readOnly
        />
      ) : null}

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
        <section
          data-readiness-field="pests"
          className={cn(
            "rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3",
            isHighlighted("pests") ? FIELD_HIGHLIGHT_CLASS : null,
          )}
        >
          <BugsFoundToggle
            plantId={plant.id}
            bugsFound={bugsFound}
            disabled={isCollected}
            onBugsFoundChange={(next) => {
              setBugsFound(next);
              if (next === true) setBugsFoundEver(true);
              if (next === true || next === false) {
                clearReadinessHighlight("pests");
              }
            }}
          />
        </section>
      ) : null}

      {showPestType ? (
        <PestTypeField
          plantId={plant.id}
          options={pestTypeOptions}
          initialPestTypeOptionId={plant.pestTypeOptionId}
          readOnly={isCollected}
          highlighted={isHighlighted("pest_type")}
          onPestTypeChange={(pestTypeOptionId) => {
            if (pestTypeOptionId) clearReadinessHighlight("pest_type");
          }}
        />
      ) : null}

      {showPestTreatments ? (
        <PestTreatmentsSection
          plantId={plant.id}
          treatments={plant.pestTreatments}
          options={pestTreatmentOptions}
          disabled={isCollected}
          highlighted={isHighlighted("pest_treatments")}
          onTreatmentsChange={(treatments) => {
            if (treatments.length >= 3) clearReadinessHighlight("pest_treatments");
          }}
        />
      ) : null}

      {!isOutpatient ? treatmentNotes : null}

      <CareTipsSection
        plantId={plant.id}
        careTip={plant.careTip}
        optionsByCategory={careTipOptions}
        compact
        readOnly={isCollected}
        highlighted={isHighlighted("care_tips")}
        onHighlightClear={() => clearReadinessHighlight("care_tips")}
      />

      <PricingSummarySection
        pricing={pricing}
        bugsFound={bugsFound}
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
            bugsFound={bugsFound}
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
