import { z } from "zod";
import { PLANT_SIZES } from "@/lib/plant-size";

export const CHECK_IN_INTERNAL_NOTES_MIN_LENGTH = 12;

const checkInPlantCoreSchema = {
  clientId: z.string().min(1),
  size: z.enum(PLANT_SIZES, { message: "Select a size" }),
  /** Kept for draft/API compat; UI no longer collects plant nicknames (HIL-129). */
  name: z.string().trim().optional().default(""),
  species: z.string().trim(),
  /** true = Yes, false = No, null = Not sure. Unanswered uses undefined on the form input. */
  bugsFound: z.union([z.literal(true), z.literal(false), z.null()]),
  /** Optional pest type when bugsFound === true (HIL-131). */
  pestTypeOptionId: z.string().uuid().nullable().optional(),
  /** Kept for draft/API compat; pot consent UI removed (HIL-129). */
  potSizeChangeConsent: z.boolean().default(false),
};

export const checkInPlantSchema = z.object({
  ...checkInPlantCoreSchema,
  notes: z.string().trim(),
});

export const checkInPlantPhotosSchema = z.object({
  ...checkInPlantCoreSchema,
  notes: z
    .string()
    .trim()
    .min(
      CHECK_IN_INTERNAL_NOTES_MIN_LENGTH,
      `Internal notes must be at least ${CHECK_IN_INTERNAL_NOTES_MIN_LENGTH} characters`,
    ),
});

export const checkInPlantsStepSchema = z.object({
  plants: z.array(checkInPlantSchema).min(1, "Add at least one plant"),
});

export const checkInPlantsPhotosStepSchema = z.object({
  plants: z.array(checkInPlantPhotosSchema).min(1, "Add at least one plant"),
});

export type CheckInPlant = z.infer<typeof checkInPlantSchema>;
export type CheckInPlantInput = Omit<
  z.input<typeof checkInPlantSchema>,
  "bugsFound" | "potSizeChangeConsent" | "pestTypeOptionId"
> & {
  bugsFound: boolean | null | undefined;
  potSizeChangeConsent?: boolean;
  pestTypeOptionId?: string | null;
};

export function createEmptyPlant(): CheckInPlantInput {
  return {
    clientId: crypto.randomUUID(),
    size: "M",
    name: "",
    species: "",
    notes: "",
    bugsFound: undefined,
    pestTypeOptionId: null,
    potSizeChangeConsent: false,
  };
}

/** Staff has chosen Yes, No, or Not sure (null). */
export function isBugsFoundAnswered(bugsFound: boolean | null | undefined): boolean {
  return bugsFound === true || bugsFound === false || bugsFound === null;
}
