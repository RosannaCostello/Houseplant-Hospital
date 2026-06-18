import "server-only";

import {
  getMailchimpConfig,
  mailchimpApiBaseUrl,
  type MailchimpConfig,
} from "@/lib/mailchimp/env";
import type { MailchimpApiErrorBody } from "@/lib/mailchimp/types";

export class MailchimpApiError extends Error {
  readonly status: number;
  readonly body: MailchimpApiErrorBody | null;

  constructor(message: string, status: number, body: MailchimpApiErrorBody | null) {
    super(message);
    this.name = "MailchimpApiError";
    this.status = status;
    this.body = body;
  }
}

function authorizationHeader(apiKey: string): string {
  const token = Buffer.from(`anystring:${apiKey}`).toString("base64");
  return `Basic ${token}`;
}

async function parseErrorBody(response: Response): Promise<MailchimpApiErrorBody | null> {
  try {
    return (await response.json()) as MailchimpApiErrorBody;
  } catch {
    return null;
  }
}

function formatMailchimpError(status: number, body: MailchimpApiErrorBody | null): string {
  const parts = [body?.title, body?.detail].filter(Boolean);
  const fieldErrors =
    body?.errors?.map((error) => `${error.field ?? "field"}: ${error.message ?? "invalid"}`) ??
    [];

  if (parts.length === 0 && fieldErrors.length === 0) {
    return `Mailchimp API request failed (${status})`;
  }

  return [...parts, ...fieldErrors].join(" — ");
}

type MailchimpRequestOptions = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  config?: MailchimpConfig;
};

export async function mailchimpRequest<T>({
  method,
  path,
  body,
  config,
}: MailchimpRequestOptions): Promise<T> {
  const { apiKey, serverPrefix } = config ?? getMailchimpConfig();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const response = await fetch(`${mailchimpApiBaseUrl(serverPrefix)}${normalizedPath}`, {
    method,
    headers: {
      Authorization: authorizationHeader(apiKey),
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);
    throw new MailchimpApiError(
      formatMailchimpError(response.status, errorBody),
      response.status,
      errorBody,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
