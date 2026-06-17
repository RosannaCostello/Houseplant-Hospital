import { z } from "zod";

export const treatmentNoteContentSchema = z
  .string()
  .trim()
  .min(1, "Enter a note before saving.")
  .max(5000, "Note is too long (max 5000 characters).");

export type TreatmentNoteContent = z.infer<typeof treatmentNoteContentSchema>;
