"use client";

import { CalendarDays, Clock3, Flame, Sun } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  DAY_LABELS,
  DAY_LABELS_FULL,
  hourLabel,
  formatNumber,
  CHART_COLORS,
} from "@/lib/market-trends";

const timingConfig: ChartConfig = {
  n: { label: "Jobs", color: CHART_COLORS[0] },
};

function fullDayData(timing: MarketTrends["timing"]) {
  const map = new Map<number, number>();
  for (const d of timing.byDay) map.set(d.dow, d.n);
  return DAY_LABELS.map((label, dow) => ({ label, dow, n: map.get(dow) ?? 0 }));
}

function fullHourData(timing: MarketTrends["timing"]) {
  const map = new Map<number, number>();
  for (const h of timing.byHour) map.set(h.hour, h.n);
  return Array.from({ length: 24 }, (_, hour) => ({ hour, label: hourLabel(hour), n: map.get(hour) ?? 0 }));
}

export function TimingTab({ data }: { data: MarketTrends }) {
  const days = fullDayData(data.timing);
  const hours = fullHourData(data.timing);
  const peakDay = [...days].sort((a, b) => b.n - a.n)[0];
  const peakHour = [...hours].sort((a, b) => b.n - a.n)[0];
  const maxDayN = Math.max(...days.map((d) => d.n), 1);
  const maxHourN = Math.max(...hours.map((h) => h.n), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Busiest day", value: peakDay ? DAY_LABELS_FULL[peakDay.dow] : "—", sub: `${formatNumber(peakDay?.n)} jobs posted`, icon: CalendarDays, tone: "accent-blue" as const },
          { label: "Busiest hour", value: peakHour ? hourLabel(peakHour.hour) : "—", sub: `${formatNumber(peakHour?.n)} jobs posted`, icon: Clock3, tone: "accent-purple" as const },
          { label: "Peak window", value: `${hourLabel(peakHour ? Math.max(0, peakHour.hour - 1) : 0)} – ${hourLabel((peakHour?.hour ?? 0) + 1)}`, sub: "hour before & after peak", icon: Flame, tone: "accent-amber" as const },
        ].map((k) => (
          <SectionCard key={k.label} icon={k.icon} title={k.label}>
            <div className="text-2xl font-bold tracking-tight text-foreground">{k.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
          </SectionCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          icon={Sun}
          title="Posting activity by day of week"
          subtitle="When clients publish the most"
        >
          <ChartContainer config={timingConfig} className="h-[280px] aspect-auto">
            <BarChart data={days} accessibilityLayer margin={{ left: 0, right: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
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
              <Bar dataKey="n" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {days.map((d) => (
                  <Cell key={d.dow} fill={d.n === maxDayN ? CHART_COLORS[2] : CHART_COLORS[0]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </SectionCard>

        <SectionCard
          icon={Clock3}
          title="Posting activity by hour"
          subtitle="24-hour distribution (UTC)"
        >
          <ChartContainer config={timingConfig} className="h-[280px] aspect-auto">
            <BarChart data={hours} accessibilityLayer margin={{ left: 0, right: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
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
              <Bar dataKey="n" radius={[2, 2, 0, 0]}>
                {hours.map((h) => (
                  <Cell key={h.hour} fill={h.n === maxHourN ? CHART_COLORS[2] : CHART_COLORS[0]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </SectionCard>
      </div>
    </div>
  );
}
