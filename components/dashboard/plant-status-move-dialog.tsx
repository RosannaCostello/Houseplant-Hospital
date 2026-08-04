"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { checkOutpatientReadinessAction } from "@/app/actions/check-outpatient-readiness";
import { updatePlantStatusAction } from "@/app/actions/update-plant-status";
import { useOptionalPlantDetailModal } from "@/components/plants/plant-detail-modal";
import { confirmationForStatusMove } from "@/lib/plants/status-move-confirmation";
import { canTransitionPlantStatus, type PlantStatus } from "@/lib/plant-status";
import { isVisitUnpaid, type PosPaymentStatus } from "@/lib/shopify/pos-checkout-types";

export type PendingPlantStatusMove = {
  plantId: string;
  fromStatus: PlantStatus;
  toStatus: PlantStatus;
  customerName: string;
  paymentStatus: PosPaymentStatus | null;
};

type ConfirmStep =
  | {
      kind: "status";
      targetStatus: PlantStatus;
      title: string;
      message: string;
      paidAnotherWay?: boolean;
    }
  | { kind: "incomplete"; message: string }
  | { kind: "unpaid_collect" };

type PlantStatusMoveDialogProps = {
  pending: PendingPlantStatusMove | null;
  onDismiss: () => void;
};

/**
 * Shared confirmation flow for dashboard drag-drop (same rules as status menu).
 */
export function PlantStatusMoveDialog({ pending, onDismiss }: PlantStatusMoveDialogProps) {
  const router = useRouter();
  const plantDetailModal = useOptionalPlantDetailModal();
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const [confirmStep, setConfirmStep] = useState<ConfirmStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!pending) {
      seededFor.current = null;
      setConfirmStep(null);
      setError(null);
      return;
    }

    const key = `${pending.plantId}:${pending.toStatus}`;
    if (seededFor.current === key) return;
    seededFor.current = key;
    setError(null);

    if (!canTransitionPlantStatus(pending.fromStatus, pending.toStatus)) {
      onDismiss();
      return;
    }

    if (pending.toStatus === "outpatient") {
      startTransition(async () => {
        const readiness = await checkOutpatientReadinessAction(pending.plantId);
        if (!readiness.ready) {
          setConfirmStep({ kind: "incomplete", message: readiness.message });
          return;
        }
        const confirm = confirmationForStatusMove(pending.fromStatus, pending.toStatus);
        if (confirm) {
          setConfirmStep({
            kind: "status",
            targetStatus: pending.toStatus,
            title: confirm.title,
            message: confirm.message,
          });
        }
      });
      return;
    }

    if (pending.toStatus === "collected" && isVisitUnpaid(pending.paymentStatus)) {
      setConfirmStep({ kind: "unpaid_collect" });
      return;
    }

    const confirm = confirmationForStatusMove(pending.fromStatus, pending.toStatus);
    if (confirm) {
      setConfirmStep({
        kind: "status",
        targetStatus: pending.toStatus,
        title: confirm.title,
        message: confirm.message,
      });
    } else {
      // No confirm copy — apply immediately
      startTransition(async () => {
        const result = await updatePlantStatusAction(pending.plantId, pending.toStatus);
        if (!result.success) {
          setError(result.error);
          return;
        }
        onDismiss();
        router.refresh();
        if (pending.toStatus === "in_surgery") {
          plantDetailModal?.openPlantDetail(pending.plantId);
        }
      });
    }
  }, [onDismiss, pending, plantDetailModal, router]);

  useEffect(() => {
    if (!pending) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onDismiss, pending]);

  function applyStatus(newStatus: PlantStatus, paidAnotherWay = false) {
    if (!pending) return;
    setError(null);
    startTransition(async () => {
      const result = await updatePlantStatusAction(pending.plantId, newStatus, { paidAnotherWay });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onDismiss();
      router.refresh();
      if (newStatus === "in_surgery") {
        plantDetailModal?.openPlantDetail(pending.plantId);
      }
    });
  }

  if (!pending || !confirmStep) {
    if (pending && error) {
      return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-hilda-heading/40" aria-label="Close" onClick={onDismiss} />
          <div className="relative z-10 w-full max-w-sm rounded-hilda border border-hilda-border/15 bg-hilda-surface p-4 shadow-xl">
            <p className="text-sm text-hilda-error-text">{error}</p>
            <button
              type="button"
              className="mt-3 w-full rounded-hilda-sm border border-hilda-border/20 bg-hilda-bg px-3 py-2 text-sm"
              onClick={onDismiss}
            >
              Close
            </button>
          </div>
        </div>,
        document.body,
      );
    }
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-hilda-heading/40"
        aria-label="Cancel move"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-hilda border border-hilda-border/15 bg-hilda-surface shadow-xl"
      >
        {confirmStep.kind === "incomplete" ? (
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
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-bugs bg-hilda-bugs px-4 py-2.5 text-sm font-semibold text-hilda-inverse"
                onClick={() => {
                  plantDetailModal?.openPlantDetail(pending.plantId);
                  onDismiss();
                }}
              >
                Update plant
              </button>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-border/20 bg-hilda-bg px-4 py-2.5 text-sm"
                onClick={onDismiss}
              >
                Cancel
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
                This plant is currently unpaid, you will find this order in the Shopify POS app under{" "}
                {pending.customerName}.
              </p>
            </div>
            <div className="space-y-2 p-4">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-border/20 bg-hilda-surface px-4 py-2.5 text-sm font-semibold"
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
                className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-border/20 bg-hilda-bg px-4 py-2.5 text-sm"
                onClick={onDismiss}
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
                className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-bugs bg-hilda-bugs px-4 py-2.5 text-sm font-semibold text-hilda-inverse disabled:opacity-50"
                disabled={isPending}
                onClick={() =>
                  applyStatus(confirmStep.targetStatus, Boolean(confirmStep.paidAnotherWay))
                }
              >
                {isPending ? "Updating…" : "Yes"}
              </button>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-center rounded-hilda-sm border border-hilda-border/20 bg-hilda-bg px-4 py-2.5 text-sm"
                disabled={isPending}
                onClick={onDismiss}
              >
                No
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
