import "server-only";

import {
  getMailchimpTransactionalConfig,
  MANDRILL_API_BASE,
} from "@/lib/mailchimp/transactional-env";

export class MailchimpTransactionalApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "MailchimpTransactionalApiError";
    this.status = status;
    this.body = body;
  }
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function formatError(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const record = body as { message?: string; name?: string; status?: string };
    const parts = [record.name, record.message, record.status].filter(Boolean);
    if (parts.length > 0) return parts.join(" — ");
  }
  return `Mailchimp Transactional API request failed (${status})`;
}

type MandrillRequestOptions = {
  /** Path without leading slash, e.g. `messages/send.json`. */
  path: string;
  body?: Record<string, unknown>;
};

/** POST https://mandrillapp.com/api/1.0/{path} with the md- API key. */
export async function mandrillRequest<T>({ path, body }: MandrillRequestOptions): Promise<T> {
  const { apiKey } = getMailchimpTransactionalConfig();
  const normalized = path.replace(/^\//, "").replace(/\.json$/, "") + ".json";

  const response = await fetch(`${MANDRILL_API_BASE}/${normalized}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: apiKey, ...(body ?? {}) }),
  });

  const parsed = await parseJson(response);

  if (!response.ok) {
    throw new MailchimpTransactionalApiError(formatError(response.status, parsed), response.status, parsed);
  }

  // Mandrill sometimes returns 200 with [{ status: "invalid", reject_reason: ... }]
  if (Array.isArray(parsed)) {
    const rejected = parsed.find(
      (row) =>
        row &&
        typeof row === "object" &&
        "status" in row &&
        (row as { status: string }).status !== "sent" &&
        (row as { status: string }).status !== "queued" &&
        (row as { status: string }).status !== "scheduled",
    ) as { status?: string; reject_reason?: string; email?: string } | undefined;

    if (rejected) {
      const reason = rejected.reject_reason || rejected.status || "rejected";
      throw new MailchimpTransactionalApiError(
        `Transactional send ${reason}${rejected.email ? ` (${rejected.email})` : ""}`,
        200,
        parsed,
      );
    }
  }

  return parsed as T;
}
