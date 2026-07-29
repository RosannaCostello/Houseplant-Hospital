"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkOutpatientReadinessAction } from "@/app/actions/check-outpatient-readiness";
import { updatePlantStatusAction } from "@/app/actions/update-plant-status";
import {
  allowedPlantStatusTransitions,
  PLANT_STATUS_LANES,
  plantStatusLabel,
  type PlantStatus,
} from "@/lib/plant-status";
import { cn } from "@/lib/utils";
import { PropagatePlantButton } from "@/components/plants/propagate-plant-button";
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
  paymentStatus: PosPaymentStatus | null;
  /** Dashboard card hit-target vs visible page button. */
  variant?: "overlay" | "button";
  /** Hide "Update plant" when already on the plant detail page. */
  hideUpdatePlantLink?: boolean;
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

function confirmationForStatusMove(
  from: PlantStatus,
  to: PlantStatus,
): { title: string; message: string } | null {
  if (from === "check_in" && to === "quarantine") {
    return {
      title: "Move to quarantine?",
      message: "Are you sure you want to move to quarantine?",
    };
  }
  if (
    (from === "check_in" || from === "quarantine" || from === "propagation") &&
    to === "in_surgery"
  ) {
    return {
      title: "Move to surgery?",
      message: "Are you sure you want to move to surgery?",
    };
  }
  if (from === "in_surgery" && to === "dead") {
    return {
      title: "Move to Dead?",
      message: "Are you sure you want to move to Dead?",
    };
  }
  if (from === "in_surgery" && to === "outpatient") {
    return {
      title: "Move to Outpatient?",
      message:
        "Are you sure you want to move this plant to Outpatient. This will notify the customer that the plant is ready to collect. PLEASE NOTE: If the customer has more than one plant in their visit, they will only be notified when the final plant is moved to outpatient",
    };
  }
  if (from === "outpatient" && to === "collected") {
    return {
      title: "Move to collected?",
      message: "Are you sure you want to move to collected, this cannot be undone",
    };
  }
  return null;
}

export function PlantCardStatusMenu({
  plantId,
  currentStatus,
  size,
  bugsFound,
  plantCategory,
  hasPropagation,
  customerName,
  paymentStatus,
  variant = "overlay",
  hideUpdatePlantLink = false,
  className,
}: PlantCardStatusMenuProps) {
  const router = useRouter();
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
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
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
    });
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

  function openMenu() {
    setConfirmStep(null);
    setError(null);
    setOpen(true);
  }

  return (
    <div
      className={cn(isButtonVariant ? "relative inline-flex" : "contents", className)}
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
          className="absolute inset-0 z-20 rounded-hilda transition-colors hover:bg-hilda-heading/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hilda-gold disabled:opacity-50"
          disabled={isPending}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Open plant actions"
          onClick={openMenu}
        >
          <span className="sr-only">Open plant actions</span>
        </button>
      )}

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                        <Link
                          href={`/app/plants/${plantId}`}
                          className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-bugs bg-hilda-bugs px-4 py-2.5 text-sm font-semibold text-hilda-inverse hover:brightness-95"
                          onClick={() => closeAll()}
                        >
                          Update plant
                        </Link>
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
                        <Link
                          href={`/app/plants/${plantId}`}
                          className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-bugs bg-hilda-bugs px-4 py-2.5 text-sm font-semibold text-hilda-inverse hover:brightness-95"
                          onClick={() => closeAll()}
                        >
                          Update plant
                        </Link>
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
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-bugs bg-hilda-bugs px-4 py-2.5 text-sm font-semibold text-hilda-inverse hover:brightness-95 disabled:opacity-50"
                        disabled={isPending}
                        onClick={() =>
                          applyStatus(confirmStep.targetStatus, Boolean(confirmStep.paidAnotherWay))
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
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      {!isButtonVariant && isPending && !open ? (
        <span className="pointer-events-none absolute inset-x-2 bottom-2 z-30 rounded-hilda-sm bg-hilda-surface/95 px-2 py-1 text-center text-xs text-hilda-text-muted shadow-sm">
          Updating…
        </span>
      ) : null}
      {!isButtonVariant && error && !open ? (
        <p className="pointer-events-none absolute inset-x-2 bottom-2 z-30 rounded-hilda-sm bg-hilda-error-bg px-2 py-1 text-center text-xs text-hilda-error-text shadow-sm">
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
