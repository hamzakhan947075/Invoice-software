/**
 * Minimal in-memory fixed-window rate limiter. Good enough to blunt casual
 * password-guessing against a single-instance MVP deployment; it resets on
 * restart and doesn't coordinate across instances. A multi-instance deploy
 * should replace this with a shared store (e.g. Redis) — noted as a known
 * limitation rather than something worth building out for this MVP.
 */

const attempts = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    attempts.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= max) {
    return false;
  }

  entry.count += 1;
  return true;
}
