"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckInStepHeader } from "@/components/check-in/check-in-step-header";
import { CheckInStepShell } from "@/components/check-in/check-in-step-shell";
import { PlantStepPager } from "@/components/check-in/plant-step-pager";
import { Button } from "@/components/ui/button";
import {
  checkInPlantsStepSchema,
  createEmptyPlant,
  type CheckInPlantInput,
} from "@/lib/check-in/plant-schema";
import { checkInInputClassName, checkInLabelClassName } from "@/lib/check-in/form-styles";
import { loadCheckInDraft, saveCheckInDraft } from "@/lib/check-in/draft";
import { PLANT_SIZES } from "@/lib/plant-size";
import { useCheckInDraft } from "@/lib/check-in/use-check-in-draft";
import { cn } from "@/lib/utils";

export function PlantsStepForm() {
  const router = useRouter();
  const draft = useCheckInDraft();
  const customer = draft?.customer;
  const customerName = customer ? `${customer.firstName} ${customer.lastName}` : null;

  const [editedPlants, setEditedPlants] = useState<CheckInPlantInput[] | null>(null);
  const [activePlantIndex, setActivePlantIndex] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [plantErrors, setPlantErrors] = useState<Record<string, Partial<Record<keyof CheckInPlantInput, string>>>>({});

  const plants =
    editedPlants ??
    (draft?.plants?.length ? draft.plants : [createEmptyPlant()]);

  if (!customerName || !customer) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-hilda-heading">Check-in</h1>
        <p className="text-hilda-text">Start with customer details before adding plants.</p>
        <Button asChild size="lg">
          <Link href="/app/check-in">Go to customer step</Link>
        </Button>
      </div>
    );
  }

  const activePlant = plants[Math.min(activePlantIndex, plants.length - 1)];
  const activeErrors = plantErrors[activePlant.clientId] ?? {};

  function updatePlants(next: CheckInPlantInput[]) {
    setEditedPlants(next);
    setFormError(null);
    setPlantErrors({});
  }

  function updatePlant(clientId: string, patch: Partial<CheckInPlantInput>) {
    updatePlants(plants.map((plant) => (plant.clientId === clientId ? { ...plant, ...patch } : plant)));
  }

  function addPlant() {
    const next = [...plants, createEmptyPlant()];
    updatePlants(next);
    setActivePlantIndex(next.length - 1);
  }

  function removePlant(clientId: string) {
    if (plants.length === 1) return;

    const removedIndex = plants.findIndex((plant) => plant.clientId === clientId);
    const next = plants.filter((plant) => plant.clientId !== clientId);
    updatePlants(next);

    if (removedIndex >= 0 && activePlantIndex >= removedIndex) {
      setActivePlantIndex(Math.max(0, activePlantIndex - 1));
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!customer) return;

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
        setActivePlantIndex(firstErrorIndex);
      }

      setPlantErrors(errors);
      setFormError(
        rootMessage ??
          (Object.keys(errors).length > 0
            ? "Check the highlighted fields and try again."
            : "Could not save plants. Try again."),
      );
      return;
    }

    const existing = loadCheckInDraft();
    saveCheckInDraft({
      customer,
      plants: parsed.data.plants,
      photos: existing?.photos?.filter((photo) =>
        parsed.data.plants.some((plant) => plant.clientId === photo.plantClientId),
      ),
    });
    router.push("/app/check-in/photos");
  }

  return (
    <CheckInStepShell
      maxWidth="3xl"
      header={
        <CheckInStepHeader
          step={2}
          totalSteps={3}
          title="Plants"
          description={`Plants for ${customerName}. Size required; name and species optional.`}
        />
      }
      status={formError ? <p className="text-sm text-hilda-error-text">{formError}</p> : null}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/app/check-in">Back to customer</Link>
          </Button>
          <Button type="submit" form="check-in-plants-form" className="w-full sm:w-auto">
            Continue to photos
          </Button>
        </div>
      }
    >
      <form
        id="check-in-plants-form"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
        onSubmit={onSubmit}
        noValidate
      >
        <div className="flex shrink-0 items-center gap-3">
          <PlantStepPager
            total={plants.length}
            currentIndex={activePlantIndex}
            onIndexChange={setActivePlantIndex}
            isComplete={(index) => Boolean(plants[index]?.size)}
          />
          <Button type="button" variant="outline" className="ml-auto shrink-0" onClick={addPlant}>
            Add plant
          </Button>
        </div>

        <section
          key={activePlant.clientId}
          className="shrink-0 rounded-none border border-hilda-border/15 bg-hilda-surface p-3"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-hilda-heading">Plant {activePlantIndex + 1}</h2>
            {plants.length > 1 ? (
              <button
                type="button"
                className="text-xs font-medium text-hilda-error-text hover:text-hilda-error-text-strong"
                onClick={() => removePlant(activePlant.clientId)}
              >
                Remove
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            <fieldset>
              <legend className={checkInLabelClassName}>Size</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PLANT_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={cn(
                      "min-h-10 min-w-12 rounded-none border px-3 py-1.5 text-sm font-semibold transition-colors",
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

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={checkInLabelClassName}>
                Name <span className="font-normal text-hilda-text-muted">(optional)</span>
                <input
                  className={cn(checkInInputClassName, "py-2.5")}
                  type="text"
                  value={activePlant.name}
                  onChange={(event) => updatePlant(activePlant.clientId, { name: event.target.value })}
                  placeholder="e.g. Monty"
                />
              </label>

              <label className={checkInLabelClassName}>
                Species <span className="font-normal text-hilda-text-muted">(optional)</span>
                <input
                  className={cn(checkInInputClassName, "py-2.5")}
                  type="text"
                  value={activePlant.species}
                  onChange={(event) => updatePlant(activePlant.clientId, { species: event.target.value })}
                  placeholder="e.g. Monstera deliciosa"
                />
              </label>
            </div>

            <label className={checkInLabelClassName}>
              Notes <span className="font-normal text-hilda-text-muted">(optional)</span>
              <textarea
                className={cn(checkInInputClassName, "min-h-[4.5rem] resize-none py-2.5")}
                rows={2}
                value={activePlant.notes}
                onChange={(event) => updatePlant(activePlant.clientId, { notes: event.target.value })}
                placeholder="Visible issues, pot size, customer concerns…"
              />
            </label>
          </div>
        </section>
      </form>
    </CheckInStepShell>
  );
}
