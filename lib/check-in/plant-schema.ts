import { z } from "zod";
import { PLANT_SIZES } from "@/lib/plant-size";

export const checkInPlantSchema = z.object({
  clientId: z.string().min(1),
  size: z.enum(PLANT_SIZES, { message: "Select a size" }),
  name: z.string().trim(),
  species: z.string().trim(),
  notes: z.string().trim(),
  /** true = Yes, false = No, null = Not sure. Unanswered uses undefined on the form input. */
  bugsFound: z.union([z.literal(true), z.literal(false), z.null()]),
});

export const checkInPlantsStepSchema = z.object({
  plants: z.array(checkInPlantSchema).min(1, "Add at least one plant"),
});

export type CheckInPlant = z.infer<typeof checkInPlantSchema>;
export type CheckInPlantInput = Omit<z.input<typeof checkInPlantSchema>, "bugsFound"> & {
  bugsFound: boolean | null | undefined;
};

export function createEmptyPlant(): CheckInPlantInput {
  return {
    clientId: crypto.randomUUID(),
    size: "M",
    name: "",
    species: "",
    notes: "",
    bugsFound: undefined,
  };
}

/** Staff has chosen Yes, No, or Not sure (null). */
export function isBugsFoundAnswered(bugsFound: boolean | null | undefined): boolean {
  return bugsFound === true || bugsFound === false || bugsFound === null;
}
