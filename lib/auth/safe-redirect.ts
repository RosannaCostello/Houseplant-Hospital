/** Allow same-app relative redirects only (blocks open redirects after login). */
export function safeRedirectPath(value: string | null | undefined, fallback = "/app"): string {
  if (!value) return fallback;

  // Must be a relative path within this app.
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;

  // Block protocol style forms.
  if (value.includes("://")) return fallback;

  return value;
}

