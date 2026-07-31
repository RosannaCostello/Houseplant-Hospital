/** Max chars staff can enter for treatment notes (3 × Mailchimp event chunks). */
export const TREATMENT_NOTES_MAX_CHARS = 750;

/** Max chars per Mailchimp event property chunk (under the API 255 limit). */
export const TREATMENT_NOTES_CHUNK_CHARS = 250;

export type TreatmentNotesChunks = {
  treatment_notes_1?: string;
  treatment_notes_2?: string;
  treatment_notes_3?: string;
};

/**
 * Split a treatment note into up to three Mailchimp event properties.
 * Empty trailing chunks are omitted.
 */
export function chunkTreatmentNotes(
  value: string | null | undefined,
): TreatmentNotesChunks {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return {};
  }

  const limited = trimmed.slice(0, TREATMENT_NOTES_MAX_CHARS);
  const chunks: TreatmentNotesChunks = {};
  const keys = [
    "treatment_notes_1",
    "treatment_notes_2",
    "treatment_notes_3",
  ] as const;

  for (let i = 0; i < keys.length; i += 1) {
    const start = i * TREATMENT_NOTES_CHUNK_CHARS;
    if (start >= limited.length) {
      break;
    }
    const piece = limited.slice(start, start + TREATMENT_NOTES_CHUNK_CHARS);
    if (piece) {
      chunks[keys[i]] = piece;
    }
  }

  return chunks;
}
