"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { deleteCheckInDraft, updateCheckInDraftPlants } from "@/app/actions/check-in-draft";
import {
  deferPosCheckout,
  fetchDraftCheckoutState,
  queuePosCheckout,
} from "@/app/actions/pos-checkout";
import { CheckInStepHeader } from "@/components/check-in/check-in-step-header";
import { CheckInStepShell } from "@/components/check-in/check-in-step-shell";
import { OpenShopifyPosDialog } from "@/components/check-in/open-shopify-pos-dialog";
import { BugsFoundToggleField } from "@/components/plants/bugs-found-toggle-field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { DraftCheckoutState } from "@/lib/check-in/pos-checkout";
import type { CheckInCustomer } from "@/lib/check-in/customer-schema";
import {
  checkInPlantsStepSchema,
  createEmptyPlant,
  isBugsFoundAnswered,
  type CheckInPlantInput,
} from "@/lib/check-in/plant-schema";
import { hildaLabelClassName } from "@/lib/brand/form-styles";
import { PLANT_SIZES } from "@/lib/plant-size";
import type { PosPaymentStatus } from "@/lib/shopify/pos-checkout-types";
import { canProceedToPhotosStep } from "@/lib/shopify/pos-checkout-types";
import { cn } from "@/lib/utils";

type PlantsStepFormProps = {
  draftId: string;
  customer: CheckInCustomer;
  initialPlants: CheckInPlantInput[];
  posCheckoutRequired: boolean;
  initialCheckout: DraftCheckoutState;
};

function plantsReadyForCheckout(plants: CheckInPlantInput[]): boolean {
  const parsed = checkInPlantsStepSchema.safeParse({ plants });
  if (!parsed.success) return false;
  return parsed.data.plants.every((plant) => isBugsFoundAnswered(plant.bugsFound));
}

function checkoutStatusLabel(status: PosPaymentStatus): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "pay_at_collection":
      return "Pay at collection";
    case "queued":
    case "loaded":
      return "Waiting for payment in Shopify POS";
    default:
      return "Payment required";
  }
}

export function PlantsStepForm({
  draftId,
  customer,
  initialPlants,
  posCheckoutRequired,
  initialCheckout,
}: PlantsStepFormProps) {
  const router = useRouter();
  const closingToDashboardRef = useRef(false);
  const prevCheckoutStatusRef = useRef(initialCheckout.status);
  const [editedPlants, setEditedPlants] = useState<CheckInPlantInput[] | null>(null);
  const [activePlantClientId, setActivePlantClientId] = useState<string | null>(null);
  const [checkout, setCheckout] = useState(initialCheckout);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closingToDashboard, setClosingToDashboard] = useState(false);
  const [posOpenModalDismissed, setPosOpenModalDismissed] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"pay_at_collection" | "discard" | null>(null);
  const [plantErrors, setPlantErrors] = useState<Record<string, Partial<Record<keyof CheckInPlantInput, string>>>>({});

  const plants = editedPlants ?? (initialPlants.length ? initialPlants : [createEmptyPlant()]);
  const activeClientId = activePlantClientId ?? plants[0]?.clientId ?? null;
  const activePlantIndex = plants.findIndex((plant) => plant.clientId === activeClientId);
  const activePlant = activePlantIndex >= 0 ? plants[activePlantIndex] : plants[0];
  const readyForCheckout = plantsReadyForCheckout(plants);
  const canContinueToPhotos = canProceedToPhotosStep(checkout.status, posCheckoutRequired);
  const awaitingPosPayment =
    posCheckoutRequired && (checkout.status === "queued" || checkout.status === "loaded");
  const checkoutSettled =
    posCheckoutRequired &&
    (checkout.status === "paid" || checkout.status === "pay_at_collection");
  const showOpenPosModal = awaitingPosPayment && !posOpenModalDismissed;

  useEffect(() => {
    if (!plants.some((plant) => plant.clientId === activeClientId)) {
      setActivePlantClientId(plants[0]?.clientId ?? null);
    }
  }, [plants, activeClientId]);

  useEffect(() => {
    if (!awaitingPosPayment) {
      setPosOpenModalDismissed(false);
      return;
    }
  }, [awaitingPosPayment]);

  useEffect(() => {
    if (!awaitingPosPayment) return;

    const interval = window.setInterval(() => {
      void fetchDraftCheckoutState(draftId).then((state) => {
        if (!state) return;
        setCheckout({
          status: state.status,
          queuedAt: state.queuedAt,
          paidAt: state.paidAt,
          shopifyOrderId: state.shopifyOrderId,
          summaryLines: state.summaryLines,
        });
      });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [awaitingPosPayment, draftId]);

  useEffect(() => {
    const previousStatus = prevCheckoutStatusRef.current;
    const justSettled =
      checkoutSettled && previousStatus !== checkout.status && !closingToDashboardRef.current;

    if (!justSettled) {
      prevCheckoutStatusRef.current = checkout.status;
      return;
    }

    prevCheckoutStatusRef.current = checkout.status;
    closingToDashboardRef.current = true;
    setClosingToDashboard(true);
    setSubmitting(true);
    setFormError(null);

    void (async () => {
      const parsed = checkInPlantsStepSchema.safeParse({ plants });
      if (parsed.success) {
        const result = await updateCheckInDraftPlants(draftId, parsed.data.plants);
        if (!result.success) {
          prevCheckoutStatusRef.current = previousStatus;
          closingToDashboardRef.current = false;
          setClosingToDashboard(false);
          setSubmitting(false);
          setFormError(result.error);
          return;
        }
      }

      router.push("/app");
      router.refresh();
    })();
  }, [checkout.status, checkoutSettled, draftId, plants, router]);

  function updatePlants(next: CheckInPlantInput[]) {
    setEditedPlants(next);
    setFormError(null);
    setPlantErrors({});
  }

  function updatePlant(clientId: string, patch: Partial<CheckInPlantInput>) {
    updatePlants(plants.map((plant) => (plant.clientId === clientId ? { ...plant, ...patch } : plant)));
  }

  function addPlant() {
    const newPlant = createEmptyPlant();
    updatePlants([...plants, newPlant]);
    setActivePlantClientId(newPlant.clientId);
  }

  function removePlant(clientId: string) {
    if (plants.length === 1) return;
    const index = plants.findIndex((plant) => plant.clientId === clientId);
    const next = plants.filter((plant) => plant.clientId !== clientId);
    updatePlants(next);
    if (activeClientId === clientId) {
      const fallback = next[Math.max(0, index - 1)];
      setActivePlantClientId(fallback?.clientId ?? next[0]?.clientId ?? null);
    }
  }

  function collectPlantValidationErrors() {
    const parsed = checkInPlantsStepSchema.safeParse({ plants });

    if (!parsed.success) {
      const errors: Record<string, Partial<Record<keyof CheckInPlantInput, string>>> = {};
      let rootMessage: string | null = null;
      let firstErrorClientId: string | null = null;

      for (const issue of parsed.error.issues) {
        const index = issue.path[0];
        const field = issue.path[1];

        if (typeof index === "number" && typeof field === "string") {
          const plant = plants[index];
          if (!plant) continue;

          if (firstErrorClientId === null) {
            firstErrorClientId = plant.clientId;
          }

          errors[plant.clientId] ??= {};
          if (!errors[plant.clientId][field as keyof CheckInPlantInput]) {
            errors[plant.clientId][field as keyof CheckInPlantInput] = issue.message;
          }
        } else if (issue.path[0] === "plants") {
          rootMessage = issue.message;
        }
      }

      if (firstErrorClientId) {
        setActivePlantClientId(firstErrorClientId);
      }

      setPlantErrors(errors);
      setFormError(
        rootMessage ??
          (Object.keys(errors).length > 0
            ? "Check the highlighted fields and try again."
            : "Could not save plants. Try again."),
      );
      return null;
    }

    return parsed.data.plants;
  }

  async function onContinueToPhotos(event: React.FormEvent) {
    event.preventDefault();

    const validPlants = collectPlantValidationErrors();
    if (!validPlants) return;

    if (posCheckoutRequired && !canProceedToPhotosStep(checkout.status, true)) {
      setFormError("Complete checkout in Shopify POS or choose Pay at collection before continuing.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const result = await updateCheckInDraftPlants(draftId, validPlants);

    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    router.push(`/app/check-in/photos?draft=${draftId}`);
  }

  async function onGoToCheckout() {
    const validPlants = collectPlantValidationErrors();
    if (!validPlants) return;

    if (!readyForCheckout) {
      setFormError("Select Yes, No, or Not sure for pests on each plant before checkout.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const result = await queuePosCheckout(draftId, validPlants);

    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    setPosOpenModalDismissed(false);
    setCheckout({
      status: "queued",
      queuedAt: new Date().toISOString(),
      paidAt: null,
      shopifyOrderId: null,
      summaryLines: result.summaryLines,
    });
  }

  async function runPayAtCollection() {
    const validPlants = collectPlantValidationErrors();
    if (!validPlants) return;

    setSubmitting(true);
    setFormError(null);

    const result = await deferPosCheckout(draftId, validPlants);

    setSubmitting(false);
    setConfirmAction(null);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    setCheckout((current) => ({ ...current, status: "pay_at_collection" }));
  }

  async function runDiscard() {
    setSubmitting(true);
    const result = await deleteCheckInDraft(draftId);
    setSubmitting(false);
    setConfirmAction(null);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  function onPayAtCollection() {
    if (!collectPlantValidationErrors()) return;
    setConfirmAction("pay_at_collection");
  }

  function onDiscard() {
    setConfirmAction("discard");
  }

  const activeErrors = activePlant ? (plantErrors[activePlant.clientId] ?? {}) : {};

  return (
    <CheckInStepShell
      maxWidth="3xl"
      header={
        <CheckInStepHeader
          step={2}
          totalSteps={3}
          title={`${customer.firstName} ${customer.lastName}'s Plants`}
        />
      }
      status={
        <>
          {posCheckoutRequired ? (
            <p className="text-xs text-hilda-text-muted">
              Payment status: {checkoutStatusLabel(checkout.status)}
            </p>
          ) : null}
          {formError ? <p className="text-sm text-hilda-error-text">{formError}</p> : null}
        </>
      }
      footer={
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={submitting}
                onClick={addPlant}
              >
                Add another plant
              </Button>
              {closingToDashboard ? (
                <p className="self-center text-sm text-hilda-text-muted">
                  {submitting ? "Saving and returning to dashboard…" : "Returning to dashboard…"}
                </p>
              ) : posCheckoutRequired && !canContinueToPhotos ? (
                <>
                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    disabled={submitting || !readyForCheckout || awaitingPosPayment}
                    onClick={() => void onGoToCheckout()}
                  >
                    {submitting ? "Working…" : awaitingPosPayment ? "Waiting for POS…" : "Go to checkout"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={submitting || !readyForCheckout}
                    onClick={() => void onPayAtCollection()}
                  >
                    Pay at collection
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  form="check-in-plants-form"
                  className="w-full"
                  size="lg"
                  disabled={submitting}
                >
                  {submitting ? "Saving…" : "Continue to photos"}
                </Button>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-4">
              <Button asChild variant="ghost" className="hh-check-in-discard w-full text-hilda-text-muted sm:w-auto">
                <Link href={`/app/check-in?draft=${draftId}`}>Back to customer</Link>
              </Button>
              <button
                type="button"
                className="hh-check-in-discard min-h-11 px-3 text-sm font-medium text-hilda-text-muted underline-offset-2 hover:text-hilda-heading hover:underline disabled:opacity-50"
                disabled={submitting}
                onClick={() => void onDiscard()}
              >
                Discard draft
              </button>
            </div>
          </div>
        </div>
      }
    >
      <form
        id="check-in-plants-form"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
        onSubmit={(event) => void onContinueToPhotos(event)}
        noValidate
      >
        {plants.length > 1 ? (
          <div
            className="flex shrink-0 gap-1 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Plants"
          >
            {plants.map((plant, index) => {
              const isActive = plant.clientId === activeClientId;
              const hasError = Boolean(plantErrors[plant.clientId]);
              return (
                <button
                  key={plant.clientId}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "min-h-11 shrink-0 rounded-hilda-sm border px-4 py-2 text-sm font-semibold transition-colors",
                    isActive
                      ? "border-hilda-heading bg-hilda-heading text-hilda-inverse"
                      : hasError
                        ? "border-hilda-error-border bg-hilda-error-bg text-hilda-error-text"
                        : "border-hilda-border/25 bg-hilda-surface text-hilda-heading hover:border-hilda-border/30",
                  )}
                  onClick={() => setActivePlantClientId(plant.clientId)}
                >
                  Plant {index + 1}
                </button>
              );
            })}
          </div>
        ) : null}

        {activePlant ? (
          <section
            className={cn(
              "shrink-0 rounded-hilda border bg-hilda-surface p-3",
              posCheckoutRequired && !isBugsFoundAnswered(activePlant.bugsFound)
                ? "border-hilda-warning-border"
                : "border-hilda-border/15",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-hilda-heading">
                Plant {activePlantIndex + 1}
              </h2>
              {plants.length > 1 ? (
                <button
                  type="button"
                  className="min-h-11 px-1 text-sm font-medium text-hilda-error-text hover:text-hilda-error-text-strong"
                  onClick={() => removePlant(activePlant.clientId)}
                >
                  Remove
                </button>
              ) : null}
            </div>

            <div className="space-y-3">
              <fieldset>
                <legend className={hildaLabelClassName}>Size</legend>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {PLANT_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={cn(
                        "min-h-11 min-w-14 rounded-hilda-sm border px-3 py-2 text-sm font-semibold transition-colors",
                        activePlant.size === size
                          ? "border-hilda-heading bg-hilda-heading text-hilda-inverse"
                          : "border-hilda-border/25 bg-hilda-surface text-hilda-heading hover:border-hilda-border/30",
                      )}
                      onClick={() => updatePlant(activePlant.clientId, { size })}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {activeErrors.size ? (
                  <span className="mt-1 block text-sm text-hilda-error-text">{activeErrors.size}</span>
                ) : null}
              </fieldset>

              <BugsFoundToggleField
                value={activePlant.bugsFound ?? null}
                onChange={(bugsFound) => updatePlant(activePlant.clientId, { bugsFound })}
                question="Any pests visible on this plant?"
                ariaLabel="Any pests visible on this plant"
              />
            </div>
          </section>
        ) : null}
      </form>
      <OpenShopifyPosDialog
        open={showOpenPosModal}
        onDismiss={() => setPosOpenModalDismissed(true)}
      />
      <ConfirmDialog
        open={confirmAction === "pay_at_collection"}
        title="Pay at collection?"
        message="Mark this check-in as pay at collection? You can take payment in Shopify POS when the customer collects their plants."
        confirmLabel="Pay at collection"
        pending={submitting}
        onConfirm={() => {
          void runPayAtCollection();
        }}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === "discard"}
        title="Discard check-in?"
        message="Discard this incomplete check-in? This cannot be undone."
        confirmLabel="Discard"
        destructive
        pending={submitting}
        onConfirm={() => {
          void runDiscard();
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </CheckInStepShell>
  );
}
