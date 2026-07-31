import { z } from "zod";
import { TREATMENT_NOTES_MAX_CHARS } from "@/lib/mailchimp/chunk-treatment-notes";

export const plantTextFieldSchema = z
  .string()
  .trim()
  .max(5000, "Text is too long (max 5000 characters).");

export const treatmentNotesFieldSchema = z
  .string()
  .trim()
  .max(
    TREATMENT_NOTES_MAX_CHARS,
    `Treatment notes are too long (max ${TREATMENT_NOTES_MAX_CHARS} characters).`,
  );

export type PlantTextField = z.infer<typeof plantTextFieldSchema>;
export type TreatmentNotesField = z.infer<typeof treatmentNotesFieldSchema>;
