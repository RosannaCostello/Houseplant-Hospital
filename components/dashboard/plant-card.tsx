"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { PlantCardStatusMenu } from "@/components/dashboard/plant-card-status-menu";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { BugsFoundBadge } from "@/components/plants/bugs-found-badge";
import { useOptionalPlantDetailModal } from "@/components/plants/plant-detail-modal";
import { PropagationBadge } from "@/components/plants/propagation-badge";
import { formatDaysSinceCheckIn, formatPlantAge } from "@/lib/format-plant-age";
import { formatCollectedBadgeLabel } from "@/lib/format-collected-date";
import {
  formatDaysInQuarantine,
} from "@/lib/format-quarantine-age";
import type { DashboardPlant } from "@/lib/dashboard/types";
import { formatVisitPlantPosition } from "@/lib/visits/visit-plant-position";
import { formatPlantSizeLabel } from "@/lib/plant-size";
import { cn } from "@/lib/utils";

export const DASHBOARD_PLANT_DRAG_TYPE = "application/x-hh-plant";

export type DashboardPlantDragPayload = {
  plantId: string;
  fromStatus: DashboardPlant["status"];
};

type PlantCardProps = {
  plant: DashboardPlant;
  className?: string;
  draggableCard?: boolean;
  onSearchCustomer?: (email: string) => void;
};

const imageOverlayBadgeClass =
  "inline-flex h-5 shrink-0 items-center justify-center rounded-hilda-sm px-1.5 shadow-sm";

const badgeBaseClass =
  "inline-flex items-center rounded-hilda-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide";

const footerStatusClass = "text-[11px] text-hilda-text";

function OutpatientCollectionBadge({ label }: { label: string }) {
  const ready = label === "Ready to collect";
  return (
    <span
      className={cn(
        badgeBaseClass,
        ready
          ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
          : "bg-hilda-warning-bg text-hilda-warning-text ring-1 ring-hilda-warning-border",
      )}
    >
      {label}
    </span>
  );
}

function PlantThumbnail({ thumbnailUrl }: { thumbnailUrl?: string | null }) {
  if (thumbnailUrl?.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URLs are not supported by next/image here.
      <img
        src={thumbnailUrl}
        alt=""
        draggable={false}
        className="h-full w-full object-cover [-webkit-user-drag:none]"
      />
    );
  }

  if (thumbnailUrl) {
    return (
      <Image
        src={thumbnailUrl}
        alt=""
        fill
        sizes="18rem"
        draggable={false}
        className="object-cover [-webkit-user-drag:none]"
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

export function PlantCard({
  plant,
  className,
  draggableCard = true,
  onSearchCustomer,
}: PlantCardProps) {
  const router = useRouter();
  const plantDetailModal = useOptionalPlantDetailModal();
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
  const canDrag = draggableCard && plant.status !== "collected" && plant.status !== "dead";

  function openUpdatePlant() {
    if (plantDetailModal) {
      plantDetailModal.openPlantDetail(plant.id);
      return;
    }
    router.push(`/app/plants/${plant.id}`);
  }

  return (
    <div
      className={cn(
        "relative rounded-hilda hilda-card-shadow",
        canDrag && "cursor-grab active:cursor-grabbing",
        className,
      )}
      draggable={canDrag}
      onDragStart={(event) => {
        if (!canDrag) return;
        const payload: DashboardPlantDragPayload = {
          plantId: plant.id,
          fromStatus: plant.status,
        };
        event.dataTransfer.setData(DASHBOARD_PLANT_DRAG_TYPE, JSON.stringify(payload));
        event.dataTransfer.effectAllowed = "move";

        // Always ghost the full card (image-origin drags otherwise preview only the photo).
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        event.dataTransfer.setDragImage(
          card,
          event.clientX - rect.left,
          event.clientY - rect.top,
        );
      }}
    >
      <article className="flex w-full flex-col overflow-hidden rounded-hilda bg-hilda-surface">
        <button
          type="button"
          className={cn(
            "relative block w-full shrink-0 overflow-hidden bg-hilda-bg text-left",
            CARD_IMAGE_ASPECT_CLASS,
          )}
          aria-label={`Update plant for ${plant.customerName}`}
          onClick={openUpdatePlant}
        >
          <PlantThumbnail thumbnailUrl={plant.thumbnailUrl} />
          <div className="pointer-events-none absolute left-2 top-1.5 flex items-center gap-1.5">
            <span
              className={cn(
                imageOverlayBadgeClass,
                "bg-hilda-surface text-[11px] font-semibold uppercase tracking-wide text-hilda-heading",
              )}
            >
              {formatPlantSizeLabel(plant.size)}
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
        </button>

        <div className="shrink-0">
          <div className="flex items-start gap-2 p-2.5">
            <button
              type="button"
              className="min-w-0 flex-1 space-y-1 text-left"
              onClick={openUpdatePlant}
            >
              <p className="truncate text-sm font-medium leading-8 text-hilda-heading">
                {plant.customerName}
              </p>
              <div className="min-h-4 min-w-0">
                {showFooterBadge ? (
                  showQuarantineBadge ? (
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
                    <OutpatientCollectionBadge label={plant.outpatientCollectionBadge!} />
                  ) : showCollectedBadge ? (
                    <span className={footerStatusClass}>
                      {plant.collectedAt ? formatCollectedBadgeLabel(plant.collectedAt) : "Collected"}
                    </span>
                  ) : null
                ) : null}
              </div>
            </button>

            <div className="flex shrink-0 flex-col items-end justify-between gap-1 self-stretch">
              <span className="pt-2 text-right text-[11px] font-semibold tabular-nums leading-none text-hilda-text-muted">
                {formatVisitPlantPosition(plant.visitPlantIndex, plant.visitPlantTotal)}
              </span>
              <PlantCardStatusMenu
                plantId={plant.id}
                currentStatus={plant.status}
                size={plant.size}
                bugsFound={plant.bugsFound}
                plantCategory={plant.plantCategory}
                hasPropagation={plant.hasPropagation}
                customerName={plant.customerName}
                customerEmail={plant.customerEmail}
                paymentStatus={plant.paymentStatus}
                variant="chip"
                onSearchCustomer={onSearchCustomer}
              />
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
