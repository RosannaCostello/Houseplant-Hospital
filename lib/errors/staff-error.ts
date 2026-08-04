/** Map DB / infrastructure errors to staff-safe copy. Log the raw message separately. */
export function toStaffErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (!raw) return fallback;

  const lower = raw.toLowerCase();
  if (lower.includes("jwt") || lower.includes("auth")) {
    return "You must be signed in to continue.";
  }
  if (lower.includes("row-level security") || lower.includes("permission")) {
    return "You do not have permission to do that.";
  }
  if (lower.includes("unique") || lower.includes("duplicate")) {
    return "That record already exists.";
  }
  if (lower.includes("network") || lower.includes("fetch failed")) {
    return "Network error. Check your connection and try again.";
  }

  // Keep short, known product messages; hide long PostgREST dumps.
  if (raw.length <= 160 && !raw.includes("violates") && !/column .+ does not exist/i.test(raw)) {
    return raw;
  }

  return fallback;
}
