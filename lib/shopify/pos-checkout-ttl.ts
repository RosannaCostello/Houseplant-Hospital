export const POS_CHECKOUT_QUEUE_TTL_MS = 24 * 60 * 60 * 1000;

export function isPosCheckoutQueueExpired(
  queuedAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!queuedAt) return false;
  const queuedMs = Date.parse(queuedAt);
  if (Number.isNaN(queuedMs)) return false;
  return nowMs - queuedMs >= POS_CHECKOUT_QUEUE_TTL_MS;
}
