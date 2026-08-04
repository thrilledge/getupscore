"use client";

import { Banknote, Clock, Wallet, TrendingUp } from "lucide-react";
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
import { SectionCard } from "./shared";
import {
  type MarketTrends,
  BAND_LABELS,
  formatNumber,
  formatCurrency,
  formatPct,
  sharePct,
  CHART_COLORS,
} from "@/lib/market-trends";

const bandChartConfig: ChartConfig = {
  n: { label: "Jobs", color: CHART_COLORS[0] },
};

export function BudgetsTab({ data }: { data: MarketTrends }) {
  const { meta, budgetBands, hourlyBands } = data;

  const budgetData = budgetBands.map((b) => ({
    band: BAND_LABELS[b.band] ?? b.band,
    n: b.n,
  }));
  const hourlyData = hourlyBands.map((b) => ({
    band: BAND_LABELS[b.band] ?? b.band,
    n: b.n,
  }));

  const budgetTotal = budgetData.reduce((s, b) => s + b.n, 0);
  const hourlyTotal = hourlyData.reduce((s, b) => s + b.n, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Median fixed budget", value: formatCurrency(meta.medianBudget), sub: "half of fixed jobs fall below this", icon: Wallet, tone: "accent-green" as const },
          { label: "Avg fixed budget", value: formatCurrency(meta.avgBudget, { compact: true }), sub: "mean of fixed-price jobs", icon: Banknote, tone: "accent-blue" as const },
          { label: "Median hourly rate", value: `${formatCurrency(meta.medianHourly, { compact: true })}/hr`, sub: "based on lower bound of posted rates", icon: Clock, tone: "accent-purple" as const },
          { label: "Avg hourly rate", value: `${formatCurrency(meta.avgHourly, { compact: true })}/hr`, sub: "mean lower-bound rate", icon: TrendingUp, tone: "accent-amber" as const },
        ].map((k) => (
          <SectionCard key={k.label} icon={k.icon} title={k.label}>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{k.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
          </SectionCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          icon={Wallet}
          title="Fixed-price budgets"
          subtitle={`${formatNumber(budgetTotal)} fixed-price jobs in period`}
        >
          <ChartContainer config={bandChartConfig} className="h-[300px] aspect-auto">
            <BarChart data={budgetData} accessibilityLayer margin={{ left: 0, right: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="band"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                tickFormatter={(v: string) => v}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: number) => String(v)} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => `${formatNumber(Number(value))} jobs`}
                    labelFormatter={(label) => String(label)}
                  />
                }
              />
              <Bar dataKey="n" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ChartContainer>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {budgetData.map((b) => (
              <span key={b.band} className="text-[11px] text-muted-foreground tabular-nums">
                {b.band}: {formatPct(sharePct(b.n, budgetTotal))}
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          icon={Clock}
          title="Hourly rate ranges"
          subtitle={`${formatNumber(hourlyTotal)} hourly jobs in period`}
        >
          <ChartContainer config={bandChartConfig} className="h-[300px] aspect-auto">
            <BarChart data={hourlyData} accessibilityLayer margin={{ left: 0, right: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="band"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                tickFormatter={(v: string) => v}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: number) => String(v)} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => `${formatNumber(Number(value))} jobs`}
                    labelFormatter={(label) => String(label)}
                  />
                }
              />
              <Bar dataKey="n" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ChartContainer>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {hourlyData.map((b) => (
              <span key={b.band} className="text-[11px] text-muted-foreground tabular-nums">
                {b.band}: {formatPct(sharePct(b.n, hourlyTotal))}
              </span>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
