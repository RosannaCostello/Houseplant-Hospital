import "server-only";

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return value;
}

export type MailchimpConfig = {
  apiKey: string;
  serverPrefix: string;
  audienceId: string;
};

export function isMailchimpConfigured(): boolean {
  return Boolean(
    emptyToUndefined(process.env.MAILCHIMP_API_KEY) &&
      emptyToUndefined(process.env.MAILCHIMP_SERVER_PREFIX) &&
      emptyToUndefined(process.env.MAILCHIMP_AUDIENCE_ID),
  );
}

/** When true, events are queued only — no live Mailchimp API calls (default if unset env). */
export function isMailchimpOutboxOnly(): boolean {
  if (!isMailchimpConfigured()) {
    return true;
  }

  const raw = emptyToUndefined(process.env.MAILCHIMP_OUTBOX_ONLY);
  return raw === "true" || raw === "1";
}

export function getMailchimpConfig(): MailchimpConfig {
  const apiKey = emptyToUndefined(process.env.MAILCHIMP_API_KEY);
  const serverPrefix = emptyToUndefined(process.env.MAILCHIMP_SERVER_PREFIX);
  const audienceId = emptyToUndefined(process.env.MAILCHIMP_AUDIENCE_ID);

  if (!apiKey || !serverPrefix || !audienceId) {
    throw new Error(
      "Mailchimp is not configured. Set MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX, and MAILCHIMP_AUDIENCE_ID.",
    );
  }

  return { apiKey, serverPrefix, audienceId };
}

export function mailchimpApiBaseUrl(serverPrefix: string): string {
  return `https://${serverPrefix}.api.mailchimp.com/3.0`;
}
