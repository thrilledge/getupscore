"use client";

import {
  Briefcase,
  Banknote,
  Clock,
  Layers,
  Percent,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { KpiCard, SectionCard } from "./shared";
import {
  type MarketTrends,
  formatNumber,
  formatCompact,
  formatCurrency,
  formatPct,
  sharePct,
  CHART_COLORS,
} from "@/lib/market-trends";

const overviewConfig = {
  count: { label: "Jobs posted", color: CHART_COLORS[0] },
  fixed: { label: "Fixed-price", color: CHART_COLORS[1] },
  hourly: { label: "Hourly", color: CHART_COLORS[2] },
} satisfies ChartConfig;

export function OverviewTab({ data }: { data: MarketTrends }) {
  const { meta, history, categories } = data;
  const fixedShare = sharePct(meta.fixed, meta.totalJobs);
  const hourlyShare = sharePct(meta.hourly, meta.totalJobs);

  const maxCategory = categories[0]?.n ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Jobs in period"
          value={formatNumber(meta.totalJobs)}
          sub={`last ${meta.periodDays} days`}
          icon={Briefcase}
          tone="accent-blue"
        />
        <KpiCard
          label="Fixed-price"
          value={`${formatNumber(meta.fixed)} (${formatPct(fixedShare)})`}
          sub="median budget"
          icon={Banknote}
          tone="accent-green"
        />
        <KpiCard
          label="Hourly"
          value={`${formatNumber(meta.hourly)} (${formatPct(hourlyShare)})`}
          sub="median rate"
          icon={Clock}
          tone="accent-purple"
        />
        <KpiCard
          label="Median rates"
          value={
            <span className="text-xl">
              {formatCurrency(meta.medianBudget)}
              <span className="mx-1 text-muted-foreground">/</span>
              {formatCurrency(meta.medianHourly, { prefix: "$", compact: false })}
              <span className="text-xs text-muted-foreground">/hr</span>
            </span>
          }
          sub={`avg ${formatCurrency(meta.avgBudget, { compact: true })} · ${formatCurrency(meta.avgHourly, { compact: true })}/hr`}
          icon={Percent}
          tone="accent-amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          icon={Layers}
          title="Posting volume"
          subtitle="Jobs posted per day"
        >
          <ChartContainer config={overviewConfig} className="h-[280px] aspect-auto">
            <AreaChart data={history} accessibilityLayer margin={{ left: 0, right: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v: number) => formatCompact(v)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(label) =>
                      new Date(String(label)).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                }
              />
              <Area
                dataKey="count"
                type="monotone"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                fill={CHART_COLORS[0]}
                fillOpacity={0.18}
              />
            </AreaChart>
          </ChartContainer>
        </SectionCard>

        <SectionCard
          icon={Briefcase}
          title="Fixed vs hourly mix"
          subtitle="Daily breakdown by pricing model"
        >
          <ChartContainer config={overviewConfig} className="h-[280px] aspect-auto">
            <BarChart data={history} accessibilityLayer margin={{ left: 0, right: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v: number) => formatCompact(v)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="fixed" stackId="a" fill={CHART_COLORS[1]} radius={[0, 0, 2, 2]} />
              <Bar dataKey="hourly" stackId="a" fill={CHART_COLORS[2]} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </SectionCard>
      </div>

      <SectionCard
        icon={Layers}
        title="Top categories"
        subtitle="Most common job categories"
        action={
          <span className="text-xs text-muted-foreground">
            {formatNumber(categories.reduce((s, c) => s + c.n, 0))} tagged jobs
          </span>
        }
      >
        <div className="space-y-3">
          {categories.map((c, i) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-right text-xs font-medium text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <span className="w-44 shrink-0 truncate text-sm font-medium text-foreground">
                {c.name}
              </span>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((c.n / maxCategory) * 100, 2)}%`,
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">
                {formatNumber(c.n)}
              </span>
              <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {formatPct(sharePct(c.n, meta.totalJobs))}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
