import { z } from "zod";

/** Structured print job from the Houseplant Hospital app → Mac Mini bridge. */
export const printJobPayloadSchema = z.object({
  jobId: z.string().uuid().optional(),
  plantId: z.string().uuid(),
  caseUrl: z.string().url(),
  caseLabel: z.string().min(1).max(64).optional(),
  customerSurname: z.string().min(1).max(80),
  plantName: z.string().min(1).max(120),
  size: z.string().min(1).max(40),
  pestsFound: z.boolean(),
  checkedInAt: z.string().datetime({ offset: true }).or(z.string().min(4).max(40)),
});

export type PrintJobPayload = z.infer<typeof printJobPayloadSchema>;
