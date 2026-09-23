import { z } from "zod";

export const plantTextFieldSchema = z
  .string()
  .trim()
  .max(5000, "Text is too long (max 5000 characters).");

/** Same cap as other plant text fields; Mailchimp only receives the first 750 chars. */
export const treatmentNotesFieldSchema = plantTextFieldSchema;

export type PlantTextField = z.infer<typeof plantTextFieldSchema>;
export type TreatmentNotesField = z.infer<typeof treatmentNotesFieldSchema>;
