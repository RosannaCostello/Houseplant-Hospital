import { z } from "zod";
import { PLANT_SIZES } from "@/lib/plant-size";

export const checkInPlantSchema = z.object({
  clientId: z.string().min(1),
  size: z.enum(PLANT_SIZES, { message: "Select a size" }),
  name: z.string().trim(),
  species: z.string().trim(),
  notes: z.string().trim(),
});

export const checkInPlantsStepSchema = z.object({
  plants: z.array(checkInPlantSchema).min(1, "Add at least one plant"),
});

export type CheckInPlant = z.infer<typeof checkInPlantSchema>;
export type CheckInPlantInput = z.input<typeof checkInPlantSchema>;

export function createEmptyPlant(): CheckInPlantInput {
  return {
    clientId: crypto.randomUUID(),
    size: "M",
    name: "",
    species: "",
    notes: "",
  };
}
