/** Dashboard badge copy for plants in the collected lane. */
export function formatCollectedBadgeLabel(collectedAt: string): string {
  const date = new Date(collectedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `Collected ${date}`;
}
