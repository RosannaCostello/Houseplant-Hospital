/** Shared print-job payload shape (app ↔ print-bridge). Keep in sync with print-bridge/src/payload.ts. */
export type PrintJobPayload = {
  jobId?: string;
  plantId: string;
  caseUrl?: string;
  caseLabel?: string;
  customerSurname: string;
  plantName: string;
  size: string;
  pestsFound: boolean;
  checkedInAt: string;
};

export type PrintJobStatus = "pending" | "sent" | "failed";
