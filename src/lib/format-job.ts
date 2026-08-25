/**
 * Canonical display label for a job's type. Stored values vary wildly
 * ("hourly", "fixed", "fixed-price", "FIXED_PRICE", …) so match loosely.
 */
export function formatJobType(value?: string | null): string {
  if (!value) return "—";
  const v = value.toLowerCase();
  if (v.includes("hour")) return "Hourly";
  if (v.includes("fixed")) return "Fixed";
  return "—";
}
