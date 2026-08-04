"use client";

import { BadgeCheck, Star, Wallet, Users, ShieldCheck } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { SectionCard, EmptyState } from "./shared";
import {
  type MarketTrends,
  formatNumber,
  formatCurrency,
  formatPct,
  sharePct,
  tierColor,
  CHART_COLORS,
} from "@/lib/market-trends";

const tierConfig: ChartConfig = {
  Entry: { label: "Entry", color: CHART_COLORS[2] },
  Intermediate: { label: "Intermediate", color: CHART_COLORS[1] },
  Expert: { label: "Expert", color: CHART_COLORS[0] },
  Other: { label: "Other", color: CHART_COLORS[5] },
};

export function ClientsTab({ data }: { data: MarketTrends }) {
  const { clients, meta } = data;
  const tiers = clients.tiers.filter((t) => t.n > 0);
  const tierTotal = tiers.reduce((s, t) => s + t.n, 0);
  const verifiedShare = sharePct(clients.paymentVerifiedYes, clients.paymentVerifiedTotal);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Payment verified", value: formatPct(verifiedShare), sub: `${formatNumber(clients.paymentVerifiedYes)} of ${formatNumber(clients.paymentVerifiedTotal)} jobs`, icon: ShieldCheck, tone: "accent-green" as const },
          { label: "Avg client rating", value: meta.avgClientRating != null ? meta.avgClientRating.toFixed(2) : "—", sub: "star rating when available", icon: Star, tone: "accent-amber" as const },
          { label: "Avg client spend", value: formatCurrency(meta.avgClientSpend, { compact: true }), sub: "lifetime spend when available", icon: Wallet, tone: "accent-blue" as const },
          { label: "Tier tagged jobs", value: formatNumber(tierTotal), sub: "contractor tier known", icon: Users, tone: "accent-purple" as const },
        ].map((k) => (
          <SectionCard key={k.label} icon={k.icon} title={k.label}>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{k.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
          </SectionCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          icon={Users}
          title="Contractor tier mix"
          subtitle="Complexity level clients are hiring for"
        >
          {tiers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No tier data"
              description="Contractor tier is not populated for jobs in this window."
            />
          ) : (
            <>
              <ChartContainer config={tierConfig} className="mx-auto h-[280px] aspect-square">
                <PieChart accessibilityLayer>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => `${formatNumber(Number(value))} jobs`}
                        labelFormatter={(label) => String(label)}
                      />
                    }
                  />
                  <Pie
                    data={tiers.map((t) => ({ name: t.tier, n: t.n, fill: tierColor(t.tier) }))}
                    dataKey="n"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    strokeWidth={2}
                  >
                    {tiers.map((t) => (
                      <Cell key={t.tier} fill={tierColor(t.tier)} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
              <div className="mt-4 grid gap-2">
                {tiers.map((t) => (
                  <div key={t.tier} className="flex items-center gap-3">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: tierColor(t.tier) }}
                    />
                    <span className="w-28 text-sm font-medium text-foreground">{t.tier}</span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${sharePct(t.n, tierTotal)}%`, backgroundColor: tierColor(t.tier) }}
                      />
                    </div>
                    <span className="w-16 text-right text-sm font-semibold text-foreground tabular-nums">
                      {formatNumber(t.n)}
                    </span>
                    <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                      {formatPct(sharePct(t.n, tierTotal))}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard
          icon={BadgeCheck}
          title="Payment verification"
          subtitle="Clients with a verified payment method"
        >
          <div className="flex items-center gap-6 py-6">
            <div className="relative flex size-36 shrink-0 items-center justify-center rounded-full bg-muted">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${CHART_COLORS[1]} ${verifiedShare * 3.6}deg, var(--muted) 0deg)`,
                }}
              />
              <div className="flex size-28 flex-col items-center justify-center rounded-full bg-card">
                <span className="text-2xl font-bold text-foreground tabular-nums">{formatPct(verifiedShare)}</span>
                <span className="text-[11px] text-muted-foreground">verified</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "Verified", value: formatNumber(clients.paymentVerifiedYes), color: CHART_COLORS[1] },
                { label: "Not verified / unknown", value: formatNumber(clients.paymentVerifiedTotal - clients.paymentVerifiedYes), color: CHART_COLORS[5] },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <span className="ml-auto text-sm font-semibold text-foreground tabular-nums">{s.value}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Verification is only captured for enriched jobs — most older records are untagged.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
