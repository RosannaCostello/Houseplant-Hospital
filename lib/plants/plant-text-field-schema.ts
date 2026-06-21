import { z } from "zod";

export const plantTextFieldSchema = z
  .string()
  .trim()
  .max(5000, "Text is too long (max 5000 characters).");

export type PlantTextField = z.infer<typeof plantTextFieldSchema>;
