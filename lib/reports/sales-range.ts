// Default date range for the /reports sales list.
// Pure functions (no React) so they can be unit-tested directly.

/** Today as YYYY-MM-DD (UTC, matching the rest of the reports page). */
export function todayStr(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** First day of the month containing `now`, as YYYY-MM-DD. */
export function monthStartStr(now: Date = new Date()): string {
  return now.toISOString().slice(0, 8) + '01';
}

/**
 * Resolve the sales-list date range from the URL params.
 * - Both missing (first open of /reports): default to the 1st of the current
 *   month through today, so the list loads immediately instead of showing 0
 *   until the user clicks 「查询」.
 * - Exactly one present: keep it as-is (partial-range behaviour unchanged).
 * - Both present: keep as-is.
 */
export function resolveSalesRange(
  from?: string | null,
  to?: string | null,
  now: Date = new Date()
): { from?: string; to?: string } {
  if (!from && !to) {
    return { from: monthStartStr(now), to: todayStr(now) };
  }
  return { from: from || undefined, to: to || undefined };
}
