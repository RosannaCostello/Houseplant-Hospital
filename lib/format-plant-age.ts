/** Human-readable check-in age for dashboard cards. */
export function formatPlantAge(checkedInAt: string | Date, now = new Date()): string {
  const checkedIn = new Date(checkedInAt);
  const diffMs = now.getTime() - checkedIn.getTime();

  if (diffMs < 0) return "Today";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/** Badge copy for plants still in the check-in lane. */
export function formatDaysSinceCheckIn(checkedInAt: string | Date, now = new Date()): string {
  const checkedIn = new Date(checkedInAt);
  const diffMs = now.getTime() - checkedIn.getTime();

  if (diffMs < 0) return "Today since check-in";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today since check-in";
  if (days === 1) return "1 day since check-in";
  return `${days} days since check-in`;
}
