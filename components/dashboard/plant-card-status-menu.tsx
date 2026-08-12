"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { checkOutpatientReadinessAction } from "@/app/actions/check-outpatient-readiness";
import { updatePlantStatusAction } from "@/app/actions/update-plant-status";
import {
  allowedPlantStatusTransitions,
  PLANT_STATUS_LANES,
  plantStatusLabel,
  type PlantStatus,
} from "@/lib/plant-status";
import { confirmationForStatusMove } from "@/lib/plants/status-move-confirmation";
import { lockBodyScroll } from "@/lib/ui/body-scroll-lock";
import { STAFF_OVERLAY_Z } from "@/lib/ui/overlay-z";
import { cn } from "@/lib/utils";
import { PropagatePlantButton } from "@/components/plants/propagate-plant-button";
import { useOptionalPlantDetailModal } from "@/components/plants/plant-detail-modal";
import type { PlantCategory } from "@/lib/plant-category";
import { isVisitUnpaid, type PosPaymentStatus } from "@/lib/shopify/pos-checkout-types";

type PlantCardStatusMenuProps = {
  plantId: string;
  currentStatus: PlantStatus;
  size: string;
  bugsFound: boolean | null;
  plantCategory: PlantCategory;
  hasPropagation: boolean;
  customerName: string;
  customerEmail?: string;
  paymentStatus: PosPaymentStatus | null;
  /** Card corner control vs full-page button. Overlay kept for back-compat alias of chip. */
  variant?: "overlay" | "button" | "chip";
  /** Hide "Update plant" when already on the plant detail page. */
  hideUpdatePlantLink?: boolean;
  onSearchCustomer?: (email: string) => void;
  className?: string;
};

type ConfirmStep =
  | {
      kind: "status";
      targetStatus: PlantStatus;
      title: string;
      message: string;
      paidAnotherWay?: boolean;
    }
  | {
      kind: "incomplete";
      message: string;
    }
  | {
      kind: "unpaid_collect";
    };

export function PlantCardStatusMenu({
  plantId,
  currentStatus,
  size,
  bugsFound,
  plantCategory,
  hasPropagation,
  customerName,
  customerEmail,
  paymentStatus,
  variant = "overlay",
  hideUpdatePlantLink = false,
  onSearchCustomer,
  className,
}: PlantCardStatusMenuProps) {
  const router = useRouter();
  const plantDetailModal = useOptionalPlantDetailModal();
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const [open, setOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState<ConfirmStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const allowedStatuses = allowedPlantStatusTransitions(currentStatus);
  const availableLanes = PLANT_STATUS_LANES.filter((lane) =>
    allowedStatuses.includes(lane.status),
  );
  const showPropagate = currentStatus === "in_surgery" && plantCategory === "standard";
  const propagateDisabledReason = hasPropagation
    ? "This plant has already been propagated."
    : bugsFound !== false
      ? "Plants with pests cannot be propagated."
      : undefined;

  useEffect(() => {
    if (!open) return;

    const triggerElement = triggerRef.current;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (confirmStep) {
          setConfirmStep(null);
          return;
        }
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const unlock = lockBodyScroll();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlock();
      triggerElement?.focus();
    };
  }, [confirmStep, open]);

  function closeAll() {
    setConfirmStep(null);
    setOpen(false);
  }

  function applyStatus(newStatus: PlantStatus, paidAnotherWay = false) {
    setError(null);

    startTransition(async () => {
      const result = await updatePlantStatusAction(plantId, newStatus, { paidAnotherWay });

      if (!result.success) {
        setError(result.error);
        setConfirmStep(null);
        return;
      }

      closeAll();
      router.refresh();

      if (newStatus === "in_surgery" || hideUpdatePlantLink) {
        plantDetailModal?.openPlantDetail(plantId);
      }
    });
  }

  function openUpdatePlant() {
    closeAll();
    if (plantDetailModal) {
      plantDetailModal.openPlantDetail(plantId);
      return;
    }
    router.push(`/app/plants/${plantId}`);
  }

  function searchCustomer() {
    const email = customerEmail?.trim();
    if (!email || !onSearchCustomer) return;
    closeAll();
    onSearchCustomer(email);
  }

  function selectStatus(newStatus: PlantStatus) {
    if (newStatus === currentStatus || isPending) return;

    setError(null);

    if (newStatus === "outpatient") {
      startTransition(async () => {
        const readiness = await checkOutpatientReadinessAction(plantId);
        if (!readiness.ready) {
          setConfirmStep({ kind: "incomplete", message: readiness.message });
          return;
        }

        const confirm = confirmationForStatusMove(currentStatus, newStatus);
        if (confirm) {
          setConfirmStep({
            kind: "status",
            targetStatus: newStatus,
            title: confirm.title,
            message: confirm.message,
          });
        } else {
          applyStatus(newStatus);
        }
      });
      return;
    }

    if (newStatus === "collected" && isVisitUnpaid(paymentStatus)) {
      setConfirmStep({ kind: "unpaid_collect" });
      return;
    }

    const confirm = confirmationForStatusMove(currentStatus, newStatus);
    if (confirm) {
      setConfirmStep({
        kind: "status",
        targetStatus: newStatus,
        title: confirm.title,
        message: confirm.message,
      });
      return;
    }

    applyStatus(newStatus);
  }

  const showingConfirm = confirmStep !== null;
  const isButtonVariant = variant === "button";
  const isChipVariant = variant === "overlay" || variant === "chip";

  function openMenu() {
    setConfirmStep(null);
    setError(null);
    setOpen(true);
  }

  return (
    <div
      className={cn(
        isButtonVariant || isChipVariant ? "relative inline-flex shrink-0" : "contents",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {isButtonVariant ? (
        <button
          ref={triggerRef}
          type="button"
          className="inline-flex min-h-10 items-center justify-center rounded-hilda-sm border border-hilda-bugs bg-hilda-bugs px-3 py-2 text-sm font-semibold text-hilda-inverse hover:brightness-95 disabled:opacity-50"
          disabled={isPending}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={openMenu}
        >
          Actions
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          className="-mr-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-hilda-sm text-hilda-heading transition-colors hover:bg-hilda-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hilda-gold disabled:opacity-50"
          disabled={isPending}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Open plant actions"
          onClick={openMenu}
        >
          <svg aria-hidden viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
            <circle cx="3.25" cy="8" r="1.35" />
            <circle cx="8" cy="8" r="1.35" />
            <circle cx="12.75" cy="8" r="1.35" />
          </svg>
        </button>
      )}

      {open
        ? createPortal(
            <div className={cn("fixed inset-0 flex items-center justify-center p-4", STAFF_OVERLAY_Z)}>
              <button
                type="button"
                className="absolute inset-0 bg-hilda-heading/40"
                aria-label="Close plant actions"
                onClick={() => closeAll()}
              />

              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={dialogTitleId}
                aria-describedby={dialogDescriptionId}
                className="relative z-10 w-full max-w-sm overflow-hidden rounded-hilda border border-hilda-border/15 bg-hilda-surface shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                {!showingConfirm ? (
                  <>
                    <div className="border-b border-hilda-border/10 px-4 py-3">
                      <h2
                        id={dialogTitleId}
                        className="font-serif text-lg font-normal text-hilda-heading"
                      >
                        Plant actions
                      </h2>
                      <p id={dialogDescriptionId} className="mt-1 text-sm text-hilda-text">
                        Currently in {plantStatusLabel(currentStatus)}
                      </p>
                    </div>

                    <div className="max-h-[min(24rem,60dvh)] space-y-2 overflow-y-auto p-4">
                      {!hideUpdatePlantLink ? (
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-bugs bg-hilda-bugs px-4 py-2.5 text-sm font-semibold text-hilda-inverse hover:brightness-95"
                          onClick={openUpdatePlant}
                        >
                          Update plant
                        </button>
                      ) : null}
                      {availableLanes.map((lane) => (
                        <button
                          key={lane.status}
                          type="button"
                          className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-border/20 bg-hilda-surface px-4 py-2.5 text-sm font-semibold text-hilda-heading hover:bg-hilda-bg"
                          disabled={isPending}
                          onClick={() => selectStatus(lane.status)}
                        >
                          Move to {lane.label}
                        </button>
                      ))}
                      {showPropagate ? (
                        <PropagatePlantButton
                          plantId={plantId}
                          initialSize={size}
                          disabledReason={propagateDisabledReason}
                          onSuccess={() => closeAll()}
                        />
                      ) : null}
                      {onSearchCustomer && customerEmail?.trim() ? (
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-border/20 bg-hilda-surface px-4 py-2.5 text-sm font-semibold text-hilda-heading hover:bg-hilda-bg"
                          onClick={searchCustomer}
                        >
                          Search customer
                        </button>
                      ) : null}
                      {error ? <p className="text-sm text-hilda-error-text">{error}</p> : null}
                    </div>

                    <div className="border-t border-hilda-border/10 px-4 py-3">
                      <button
                        type="button"
                        className="w-full rounded-hilda-sm border border-hilda-border/20 bg-hilda-bg px-3 py-2 text-sm font-medium text-hilda-heading transition-colors hover:bg-hilda-surface"
                        onClick={() => closeAll()}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : confirmStep.kind === "incomplete" ? (
                  <>
                    <div className="border-b border-hilda-border/10 px-4 py-3">
                      <h2 id={dialogTitleId} className="font-serif text-lg text-hilda-heading">
                        Complete plant record
                      </h2>
                      <p id={dialogDescriptionId} className="mt-1 text-sm text-hilda-text">
                        {confirmStep.message}
                      </p>
                    </div>
                    <div className="space-y-2 p-4">
                      {!hideUpdatePlantLink ? (
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-bugs bg-hilda-bugs px-4 py-2.5 text-sm font-semibold text-hilda-inverse hover:brightness-95"
                          onClick={openUpdatePlant}
                        >
                          Update plant
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-border/20 bg-hilda-bg px-4 py-2.5 text-sm font-medium text-hilda-heading"
                        onClick={() => setConfirmStep(null)}
                      >
                        Back
                      </button>
                    </div>
                  </>
                ) : confirmStep.kind === "unpaid_collect" ? (
                  <>
                    <div className="border-b border-hilda-border/10 px-4 py-3">
                      <h2 id={dialogTitleId} className="font-serif text-lg text-hilda-heading">
                        Plant unpaid
                      </h2>
                      <p id={dialogDescriptionId} className="mt-1 text-sm text-hilda-text">
                        This plant is currently unpaid, you will find this order in the Shopify POS
                        app under {customerName}.
                      </p>
                    </div>
                    <div className="space-y-2 p-4">
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-border/20 bg-hilda-surface px-4 py-2.5 text-sm font-semibold text-hilda-heading hover:bg-hilda-bg"
                        disabled={isPending}
                        onClick={() =>
                          setConfirmStep({
                            kind: "status",
                            targetStatus: "collected",
                            title: "Customer paid another way?",
                            message:
                              "Are you sure the customer has paid and move this plant to Collected, this cannot be undone.",
                            paidAnotherWay: true,
                          })
                        }
                      >
                        Customer paid another way
                      </button>
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-border/20 bg-hilda-bg px-4 py-2.5 text-sm font-medium text-hilda-heading"
                        onClick={() => setConfirmStep(null)}
                      >
                        No
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border-b border-hilda-border/10 px-4 py-3">
                      <h2 id={dialogTitleId} className="font-serif text-lg text-hilda-heading">
                        {confirmStep.title}
                      </h2>
                      <p id={dialogDescriptionId} className="mt-1 text-sm text-hilda-text">
                        {confirmStep.message}
                      </p>
                    </div>
                    <div className="space-y-2 p-4">
                      {error ? <p className="text-sm text-hilda-error-text">{error}</p> : null}
                      {confirmStep.paidAnotherWay ? (
                        <>
                          <button
                            type="button"
                            className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-border/20 bg-hilda-bg px-4 py-2.5 text-sm font-medium text-hilda-heading"
                            disabled={isPending}
                            onClick={() => setConfirmStep(null)}
                          >
                            No
                          </button>
                          <button
                            type="button"
                            className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-bugs bg-hilda-bugs px-4 py-2.5 text-sm font-semibold text-hilda-inverse hover:brightness-95 disabled:opacity-50"
                            disabled={isPending}
                            onClick={() =>
                              applyStatus(
                                confirmStep.targetStatus,
                                Boolean(confirmStep.paidAnotherWay),
                              )
                            }
                          >
                            {isPending ? "Updating…" : "Yes"}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-bugs bg-hilda-bugs px-4 py-2.5 text-sm font-semibold text-hilda-inverse hover:brightness-95 disabled:opacity-50"
                            disabled={isPending}
                            onClick={() =>
                              applyStatus(
                                confirmStep.targetStatus,
                                Boolean(confirmStep.paidAnotherWay),
                              )
                            }
                          >
                            {isPending ? "Updating…" : "Yes"}
                          </button>
                          <button
                            type="button"
                            className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-border/20 bg-hilda-bg px-4 py-2.5 text-sm font-medium text-hilda-heading"
                            disabled={isPending}
                            onClick={() => setConfirmStep(null)}
                          >
                            No
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      {!isButtonVariant && isPending && !open ? (
        <span className="pointer-events-none absolute bottom-full right-0 mb-1 rounded-hilda-sm bg-hilda-surface/95 px-2 py-1 text-center text-xs text-hilda-text-muted shadow-sm">
          Updating…
        </span>
      ) : null}
      {!isButtonVariant && error && !open ? (
        <p className="pointer-events-none absolute bottom-full right-0 mb-1 max-w-[10rem] rounded-hilda-sm bg-hilda-error-bg px-2 py-1 text-center text-xs text-hilda-error-text shadow-sm">
          {error}
        </p>
      ) : null}
      {isButtonVariant && error && !open ? (
        <p className="absolute right-0 top-full z-10 mt-1 max-w-xs rounded-hilda-sm bg-hilda-error-bg px-2 py-1 text-xs text-hilda-error-text shadow-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
