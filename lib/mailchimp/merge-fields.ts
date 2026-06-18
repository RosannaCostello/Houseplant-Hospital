/** Hilda audience merge field tags (from Mailchimp audience settings). */
export const HILDA_MERGE_FIELDS = {
  name: "NAME",
  phone: "PHONE",
} as const;

export type BuildMergeFieldsInput = {
  firstName: string;
  lastName: string;
  phone?: string | null;
};

/** Map app customer fields to the Hilda Mailchimp audience merge fields. */
export function buildHildaMergeFields(input: BuildMergeFieldsInput): Record<string, string> {
  const fullName = [input.firstName.trim(), input.lastName.trim()].filter(Boolean).join(" ");

  const mergeFields: Record<string, string> = {
    [HILDA_MERGE_FIELDS.name]: fullName,
  };

  const phone = input.phone?.trim();
  if (phone) {
    mergeFields[HILDA_MERGE_FIELDS.phone] = phone;
  }

  return mergeFields;
}
