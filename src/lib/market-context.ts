import type { MarketTrends } from "@/lib/market-trends";

/**
 * Renders the market-trends RPC payload as a compact, line-oriented text
 * block that gets injected into AI system prompts. The AI uses it as
 * context when auditing profiles, positioning skills, or advising on
 * pricing/niche — without paying the token cost of the full JSON.
 */
export function formatMarketContext(trends: MarketTrends, days = 30): string {
  const m = trends.meta;
  const lines: string[] = [];

  lines.push(`=== MARKET TRENDS CONTEXT (last ${days} days) ===`);
  lines.push(
    `Tracked jobs: ${m.totalJobs.toLocaleString("en-US")} (fixed ${m.fixed}, hourly ${m.hourly}, other ${m.other})`
  );
  lines.push(
    `Pricing: median budget $${m.medianBudget ?? "n/a"}, avg $${m.avgBudget ?? "n/a"} | median hourly $${m.medianHourly ?? "n/a"}, avg $${m.avgHourly ?? "n/a"}`
  );
  if (m.avgClientRating != null) {
    lines.push(`Avg client rating: ${m.avgClientRating}/5`);
  }

  const skillLine = (name: string, count: number, delta: number | null): string => {
    const pct = delta == null ? "new" : `${delta > 0 ? "+" : ""}${delta.toFixed(0)}%`;
    return `${name}: ${count} jobs (${pct} vs prior week)`;
  };

  const topSkills = trends.skills.slice(0, 12);
  if (topSkills.length) {
    lines.push("Top skills by demand: " + topSkills.map((s) => skillLine(s.name, s.count, s.deltaPct)).join(" | "));
  }

  const cats = trends.categories.slice(0, 8);
  if (cats.length) {
    lines.push("Top categories: " + cats.map((c) => `${c.name} (${c.n})`).join(", "));
  }

  const subs = trends.subcategories.slice(0, 8);
  if (subs.length) {
    lines.push("Top subcategories: " + subs.map((c) => `${c.name} (${c.n})`).join(", "));
  }

  if (trends.budgetBands.length) {
    const total = trends.budgetBands.reduce((acc, b) => acc + b.n, 0);
    const bands = trends.budgetBands
      .map((b) => `${b.band} ${total ? Math.round((b.n / total) * 100) : 0}%`)
      .join(", ");
    lines.push(`Budget distribution: ${bands}`);
  }

  if (trends.hourlyBands.length) {
    const total = trends.hourlyBands.reduce((acc, b) => acc + b.n, 0);
    const bands = trends.hourlyBands
      .map((b) => `${b.band} ${total ? Math.round((b.n / total) * 100) : 0}%`)
      .join(", ");
    lines.push(`Hourly distribution: ${bands}`);
  }

  const geo = trends.geography.slice(0, 6);
  if (geo.length) {
    lines.push("Client locations: " + geo.map((g) => `${g.name} (${g.n})`).join(", "));
  }

  const tiers = trends.clients?.tiers ?? [];
  if (tiers.length) {
    lines.push("Client tiers: " + tiers.map((t) => `${t.tier} (${t.n})`).join(", "));
  }

  const verified = trends.clients;
  if (verified && verified.paymentVerifiedTotal > 0) {
    const yesPct = Math.round((verified.paymentVerifiedYes / verified.paymentVerifiedTotal) * 100);
    lines.push(`Payment verified: ${yesPct}% (${verified.paymentVerifiedYes}/${verified.paymentVerifiedTotal})`);
  }

  lines.push("");
  return lines.join("\n");
}
