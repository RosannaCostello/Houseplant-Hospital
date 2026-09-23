import "server-only";

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return value.trim();
}

export type MailchimpTransactionalConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
};

export function isMailchimpTransactionalConfigured(): boolean {
  return Boolean(emptyToUndefined(process.env.MAILCHIMP_TRANSACTIONAL_API_KEY));
}

export function getMailchimpTransactionalConfig(): MailchimpTransactionalConfig {
  const apiKey = emptyToUndefined(process.env.MAILCHIMP_TRANSACTIONAL_API_KEY);
  if (!apiKey) {
    throw new Error(
      "Mailchimp Transactional is not configured. Set MAILCHIMP_TRANSACTIONAL_API_KEY (md-…).",
    );
  }

  const fromEmail =
    emptyToUndefined(process.env.MAILCHIMP_TRANSACTIONAL_FROM_EMAIL) ?? "hospital@hilda.co";
  const fromName =
    emptyToUndefined(process.env.MAILCHIMP_TRANSACTIONAL_FROM_NAME) ?? "Hilda Houseplant Hospital";

  return { apiKey, fromEmail, fromName };
}

export const MANDRILL_API_BASE = "https://mandrillapp.com/api/1.0";
