function daysSince(since: string | Date, now = new Date()): number {
  const start = new Date(since);
  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** Compact day count for quarantine overlay badges on dashboard cards. */
export function formatQuarantineBadgeDays(quarantineSince: string | Date, now = new Date()): string {
  const days = daysSince(quarantineSince, now);

  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/** How long a plant has been in the quarantine lane (from latest move into quarantine). */
export function formatDaysInQuarantine(quarantineSince: string | Date, now = new Date()): string {
  const days = daysSince(quarantineSince, now);

  if (days === 0) return "Today in quarantine";
  if (days === 1) return "1 day in quarantine";
  return `${days} days in quarantine`;
}
