"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckInStepHeader } from "@/components/check-in/check-in-step-header";
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
  const [formError, setFormError] = useState<string | null>(null);
  const [plantErrors, setPlantErrors] = useState<Record<string, Partial<Record<keyof CheckInPlantInput, string>>>>({});

  const plants =
    editedPlants ??
    (draft?.plants?.length ? draft.plants : [createEmptyPlant()]);

  if (!customerName || !customer) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Check-in</h1>
        <p className="text-zinc-600">Start with customer details before adding plants.</p>
        <Button asChild size="lg">
          <Link href="/app/check-in">Go to customer step</Link>
        </Button>
      </div>
    );
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
    updatePlants([...plants, createEmptyPlant()]);
  }

  function removePlant(clientId: string) {
    if (plants.length === 1) return;
    updatePlants(plants.filter((plant) => plant.clientId !== clientId));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!customer) return;

    const parsed = checkInPlantsStepSchema.safeParse({ plants });

    if (!parsed.success) {
      const errors: Record<string, Partial<Record<keyof CheckInPlantInput, string>>> = {};
      let rootMessage: string | null = null;

      for (const issue of parsed.error.issues) {
        const index = issue.path[0];
        const field = issue.path[1];

        if (typeof index === "number" && typeof field === "string") {
          const plant = plants[index];
          if (!plant) continue;

          errors[plant.clientId] ??= {};
          if (!errors[plant.clientId][field as keyof CheckInPlantInput]) {
            errors[plant.clientId][field as keyof CheckInPlantInput] = issue.message;
          }
        } else if (issue.path[0] === "plants") {
          rootMessage = issue.message;
        }
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
    <div className="mx-auto w-full max-w-3xl">
      <CheckInStepHeader
        step={2}
        totalSteps={3}
        title="Plants"
        description={`Add each plant for ${customerName}. Size is required; name and species are optional.`}
      />

      <form className="mt-8 space-y-6" onSubmit={onSubmit} noValidate>
        <div className="space-y-4">
          {plants.map((plant, index) => {
            const errors = plantErrors[plant.clientId] ?? {};

            return (
              <section
                key={plant.clientId}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-zinc-900">Plant {index + 1}</h2>
                  {plants.length > 1 ? (
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                      onClick={() => removePlant(plant.clientId)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="space-y-5">
                  <fieldset>
                    <legend className={checkInLabelClassName}>Size</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {PLANT_SIZES.map((size) => (
                        <button
                          key={size}
                          type="button"
                          className={cn(
                            "min-h-11 min-w-14 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                            plant.size === size
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400",
                          )}
                          onClick={() => updatePlant(plant.clientId, { size })}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    {errors.size ? (
                      <span className="mt-1 block text-sm text-red-600">{errors.size}</span>
                    ) : null}
                  </fieldset>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className={checkInLabelClassName}>
                      Name <span className="font-normal text-zinc-500">(optional)</span>
                      <input
                        className={checkInInputClassName}
                        type="text"
                        value={plant.name}
                        onChange={(event) => updatePlant(plant.clientId, { name: event.target.value })}
                        placeholder="e.g. Monty"
                      />
                    </label>

                    <label className={checkInLabelClassName}>
                      Species <span className="font-normal text-zinc-500">(optional)</span>
                      <input
                        className={checkInInputClassName}
                        type="text"
                        value={plant.species}
                        onChange={(event) => updatePlant(plant.clientId, { species: event.target.value })}
                        placeholder="e.g. Monstera deliciosa"
                      />
                    </label>
                  </div>

                  <label className={checkInLabelClassName}>
                    Notes <span className="font-normal text-zinc-500">(optional)</span>
                    <textarea
                      className={cn(checkInInputClassName, "min-h-24 resize-y")}
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

        <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto" onClick={addPlant}>
          Add another plant
        </Button>

        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/app/check-in">Back to customer</Link>
          </Button>
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Continue to photos
          </Button>
        </div>
      </form>
    </div>
  );
}
