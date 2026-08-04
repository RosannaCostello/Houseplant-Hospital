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
import { SpeciesField } from "@/components/check-in/species-field";
import { BugsFoundToggleField } from "@/components/plants/bugs-found-toggle-field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { DraftCheckoutState } from "@/lib/check-in/pos-checkout";
import type { CheckInCustomer } from "@/lib/check-in/customer-schema";
import {
  checkInPlantsStepSchema,
  createEmptyPlant,
  type CheckInPlantInput,
} from "@/lib/check-in/plant-schema";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
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
  return parsed.data.plants.every((plant) => plant.bugsFound !== null);
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
  const plantSectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const closingToDashboardRef = useRef(false);
  const [editedPlants, setEditedPlants] = useState<CheckInPlantInput[] | null>(null);
  const [checkout, setCheckout] = useState(initialCheckout);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"pay_at_collection" | "discard" | null>(null);
  const [plantErrors, setPlantErrors] = useState<Record<string, Partial<Record<keyof CheckInPlantInput, string>>>>({});

  const plants = editedPlants ?? (initialPlants.length ? initialPlants : [createEmptyPlant()]);
  const readyForCheckout = plantsReadyForCheckout(plants);
  const missingBugsCount = plants.filter((plant) => plant.bugsFound === null).length;
  const canContinueToPhotos = canProceedToPhotosStep(checkout.status, posCheckoutRequired);
  const awaitingPosPayment =
    posCheckoutRequired && (checkout.status === "queued" || checkout.status === "loaded");
  const shouldReturnToDashboard =
    posCheckoutRequired &&
    (checkout.status === "paid" || checkout.status === "pay_at_collection");

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
    if (!shouldReturnToDashboard || closingToDashboardRef.current) return;

    closingToDashboardRef.current = true;
    setSubmitting(true);
    setFormError(null);

    void (async () => {
      const parsed = checkInPlantsStepSchema.safeParse({ plants });
      if (parsed.success) {
        const result = await updateCheckInDraftPlants(draftId, parsed.data.plants);
        if (!result.success) {
          closingToDashboardRef.current = false;
          setSubmitting(false);
          setFormError(result.error);
          return;
        }
      }

      router.push("/app");
      router.refresh();
    })();
  }, [shouldReturnToDashboard, draftId, plants, router]);

  function scrollToPlant(clientId: string) {
    requestAnimationFrame(() => {
      plantSectionRefs.current.get(clientId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function setPlantSectionRef(clientId: string, element: HTMLElement | null) {
    if (element) {
      plantSectionRefs.current.set(clientId, element);
    } else {
      plantSectionRefs.current.delete(clientId);
    }
  }

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
    scrollToPlant(newPlant.clientId);
  }

  function removePlant(clientId: string) {
    if (plants.length === 1) return;
    updatePlants(plants.filter((plant) => plant.clientId !== clientId));
  }

  function collectPlantValidationErrors() {
    const parsed = checkInPlantsStepSchema.safeParse({ plants });

    if (!parsed.success) {
      const errors: Record<string, Partial<Record<keyof CheckInPlantInput, string>>> = {};
      let rootMessage: string | null = null;
      let firstErrorIndex: number | null = null;

      for (const issue of parsed.error.issues) {
        const index = issue.path[0];
        const field = issue.path[1];

        if (typeof index === "number" && typeof field === "string") {
          const plant = plants[index];
          if (!plant) continue;

          if (firstErrorIndex === null) {
            firstErrorIndex = index;
          }

          errors[plant.clientId] ??= {};
          if (!errors[plant.clientId][field as keyof CheckInPlantInput]) {
            errors[plant.clientId][field as keyof CheckInPlantInput] = issue.message;
          }
        } else if (issue.path[0] === "plants") {
          rootMessage = issue.message;
        }
      }

      if (firstErrorIndex !== null) {
        const errorPlant = plants[firstErrorIndex];
        if (errorPlant) {
          scrollToPlant(errorPlant.clientId);
        }
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
      setFormError("Select whether pests were found for each plant before checkout.");
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
          {posCheckoutRequired && awaitingPosPayment ? (
            <div className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3 text-sm text-hilda-text">
              <p className="font-medium text-hilda-heading">Open Shopify POS to take payment</p>
              <p className="mt-1 text-hilda-text-muted">
                Tap the <strong>Houseplant Hospital</strong> tile, load this check-in, then complete checkout.
              </p>
              {checkout.summaryLines.length > 0 ? (
                <ul className="mt-2 list-inside list-disc text-xs text-hilda-text-muted">
                  {checkout.summaryLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {posCheckoutRequired && !readyForCheckout ? (
            <p className="rounded-hilda border border-hilda-warning-border bg-hilda-warning-bg p-3 text-sm text-hilda-warning-text">
              Answer whether pests were found for {missingBugsCount === 1 ? "the remaining plant" : `all ${missingBugsCount} remaining plants`} before checkout. Pests change the Shopify price.
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="w-full sm:w-auto" disabled={submitting}>
                <Link href={`/app/check-in?draft=${draftId}`}>Back to customer</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={submitting}
                onClick={() => void onDiscard()}
              >
                Discard draft
              </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {shouldReturnToDashboard ? (
                <p className="self-center text-sm text-hilda-text-muted">
                  {submitting ? "Saving and returning to dashboard…" : "Returning to dashboard…"}
                </p>
              ) : posCheckoutRequired && !canContinueToPhotos ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={submitting || !readyForCheckout}
                    onClick={() => void onPayAtCollection()}
                  >
                    Pay at collection
                  </Button>
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={submitting || !readyForCheckout || awaitingPosPayment}
                    onClick={() => void onGoToCheckout()}
                  >
                    {submitting ? "Working…" : awaitingPosPayment ? "Waiting for POS…" : "Go to checkout"}
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  form="check-in-plants-form"
                  className="w-full sm:w-auto"
                  disabled={submitting}
                >
                  {submitting ? "Saving…" : "Continue to photos"}
                </Button>
              )}
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
        <div className="flex shrink-0 justify-end">
          <Button type="button" variant="outline" onClick={addPlant}>
            Add plant
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {plants.map((plant, index) => {
            const errors = plantErrors[plant.clientId] ?? {};

            return (
              <section
                key={plant.clientId}
                ref={(element) => setPlantSectionRef(plant.clientId, element)}
                className={cn(
                  "shrink-0 rounded-hilda border bg-hilda-surface p-3",
                  posCheckoutRequired && plant.bugsFound === null
                    ? "border-hilda-warning-border"
                    : "border-hilda-border/15",
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-hilda-heading">Plant {index + 1}</h2>
                  {plants.length > 1 ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-hilda-error-text hover:text-hilda-error-text-strong"
                      onClick={() => removePlant(plant.clientId)}
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
                            "min-h-10 min-w-12 rounded-hilda-sm border px-3 py-1.5 text-sm font-semibold transition-colors",
                            plant.size === size
                              ? "border-hilda-heading bg-hilda-heading text-hilda-inverse"
                              : "border-hilda-border/25 bg-hilda-surface text-hilda-heading hover:border-hilda-border/30",
                          )}
                          onClick={() => updatePlant(plant.clientId, { size })}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    {errors.size ? (
                      <span className="mt-1 block text-sm text-hilda-error-text">{errors.size}</span>
                    ) : null}
                  </fieldset>

                  <BugsFoundToggleField
                    value={plant.bugsFound ?? null}
                    onChange={(bugsFound) => updatePlant(plant.clientId, { bugsFound })}
                  />
                  {posCheckoutRequired && plant.bugsFound === null ? (
                    <p className="text-sm text-hilda-warning-text">
                      Required before checkout because pests change the treatment price.
                    </p>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={hildaLabelClassName}>
                      Plant name
                      <input
                        className={cn(hildaInputClassName, "py-2.5")}
                        type="text"
                        value={plant.name}
                        onChange={(event) => updatePlant(plant.clientId, { name: event.target.value })}
                        placeholder="e.g. Monty"
                      />
                    </label>

                    <SpeciesField
                      value={plant.species}
                      error={errors.species}
                      onChange={(species) => updatePlant(plant.clientId, { species })}
                    />
                  </div>

                  <label className={hildaLabelClassName}>
                    Notes <span className="font-normal text-hilda-text-muted">(optional)</span>
                    <textarea
                      className={cn(hildaInputClassName, "min-h-[4.5rem] resize-none py-2.5")}
                      rows={2}
                      value={plant.notes}
                      onChange={(event) => updatePlant(plant.clientId, { notes: event.target.value })}
                      placeholder="Visible issues, pot size, customer concerns…"
                    />
                  </label>
                </div>
              </section>
            );
          })}
        </div>
      </form>
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
