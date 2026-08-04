"use client";

import { Globe, MapPin, Radar } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { SectionCard, EmptyState } from "./shared";
import {
  type MarketTrends,
  normalizeCountry,
  formatNumber,
  formatPct,
  sharePct,
  CHART_COLORS,
} from "@/lib/market-trends";

const geoConfig: ChartConfig = {
  n: { label: "Jobs", color: CHART_COLORS[0] },
};

export function GeographyTab({ data }: { data: MarketTrends }) {
  const { geography, meta } = data;

  const aggregated = new Map<string, number>();
  for (const g of geography) {
    const name = normalizeCountry(g.name);
    aggregated.set(name, (aggregated.get(name) ?? 0) + g.n);
  }
  const rows = [...aggregated.entries()]
    .map(([name, n]) => ({ name, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 12);

  const totalTagged = rows.reduce((s, r) => s + r.n, 0);
  const maxN = rows[0]?.n ?? 1;

  if (rows.length === 0) {
    return (
      <SectionCard icon={Globe} title="Client geography" subtitle="Where clients are located">
        <EmptyState
          icon={MapPin}
          title="No location data"
          description="No jobs in this window carry a client country tag. Enable the client enrichment pipeline to populate geography."
        />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Countries tracked", value: formatNumber(rows.length), sub: "top 12 by volume", icon: Globe, tone: "accent-blue" as const },
          { label: "Tagged jobs", value: formatNumber(totalTagged), sub: `${formatPct(sharePct(totalTagged, meta.totalJobs))} of period jobs`, icon: MapPin, tone: "accent-purple" as const },
          { label: "Top market", value: rows[0]?.name ?? "—", sub: `${formatNumber(rows[0]?.n)} jobs`, icon: Radar, tone: "accent-green" as const },
        ].map((k) => (
          <SectionCard key={k.label} icon={k.icon} title={k.label}>
            <div className="text-2xl font-bold tracking-tight text-foreground">{k.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
          </SectionCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <SectionCard
          icon={Globe}
          title="Top client countries"
          subtitle="Share of tagged jobs"
          className="lg:col-span-2"
        >
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-right text-xs font-medium text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <span className="w-32 shrink-0 truncate text-sm font-medium text-foreground">{r.name}</span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max((r.n / maxN) * 100, 2)}%`,
                      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">
                  {formatNumber(r.n)}
                </span>
                <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {formatPct(sharePct(r.n, totalTagged))}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          icon={MapPin}
          title="Distribution"
          subtitle="Jobs by country"
          className="lg:col-span-3"
        >
          <ChartContainer config={geoConfig} className="h-[340px] aspect-auto">
            <BarChart
              data={rows}
              accessibilityLayer
              layout="vertical"
              margin={{ left: 0, right: 8 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: number) => String(v)} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={130}
                tickMargin={8}
                tickFormatter={(v: string) => v}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => `${formatNumber(Number(value))} jobs`}
                    labelFormatter={(label) => String(label)}
                  />
                }
              />
              <Bar dataKey="n" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ChartContainer>
        </SectionCard>
      </div>
    </div>
  );
}
