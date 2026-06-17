import { z } from "zod";
import { checkInCustomerSchema } from "@/lib/check-in/customer-schema";
import { checkInPlantSchema } from "@/lib/check-in/plant-schema";

export const createCheckInSchema = z.object({
  customer: checkInCustomerSchema,
  plants: z.array(checkInPlantSchema).min(1, "Add at least one plant"),
});

export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;
