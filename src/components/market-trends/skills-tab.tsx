"use client";

import * as React from "react";
import { ChevronRight, TrendingUp, GitFork, Star } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionCard, DeltaBadge, EmptyState } from "./shared";
import { cn } from "@/lib/utils";
import {
  type MarketTrends,
  type SkillStat,
  buildSkillTimeline,
  topRelatedSkills,
  formatNumber,
  formatDelta,
  formatPct,
  sharePct,
  CHART_COLORS,
} from "@/lib/market-trends";

const trendConfig: ChartConfig = {
  n: { label: "Jobs", color: CHART_COLORS[0] },
};

function SkillRow({
  skill,
  index,
  data,
}: {
  skill: SkillStat;
  index: number;
  data: MarketTrends;
}) {
  const [open, setOpen] = React.useState(false);
  const [subTab, setSubTab] = React.useState("overview");
  const color = CHART_COLORS[index % CHART_COLORS.length];
  const timeline = buildSkillTimeline(data.history.map((h) => h.date), skill.name, data.skillTrend);
  const related = topRelatedSkills(skill.name, data.skillPairs);
  const share = sharePct(skill.count, data.meta.totalJobs);
  const span = `${skill.name} detail`;

  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={span}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <ChevronRight
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
        />
        <span className="w-5 shrink-0 text-right text-xs font-medium text-muted-foreground tabular-nums">
          {index + 1}
        </span>
        <span className="w-44 shrink-0 truncate text-sm font-medium text-foreground">{skill.name}</span>
        <div className="hidden h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted sm:block">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(share, 1)}%`, backgroundColor: color }}
          />
        </div>
        <div className="hidden w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums md:block">
          {formatPct(share)}
        </div>
        <div className="hidden w-20 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums lg:block">
          {formatNumber(skill.count)}
        </div>
        <div className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums lg:block">
          {formatNumber(skill.recent7)} in 7d
        </div>
        <div className="w-20 shrink-0 text-right">
          <DeltaBadge value={skill.deltaPct} />
        </div>
      </button>

      {open ? (
        <div id={span} className="bg-muted/20 px-4 pb-4 pt-1">
          <Tabs value={subTab} onValueChange={setSubTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trend">Trend</TabsTrigger>
              <TabsTrigger value="related">Related Skills</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Jobs mentioning", value: formatNumber(skill.count), sub: `${formatPct(share)} of all jobs` },
                  { label: "Last 7 days", value: formatNumber(skill.recent7), sub: "recent mentions" },
                  { label: "Prior 7 days", value: formatNumber(skill.prev7), sub: "comparison window" },
                  { label: "7-day change", value: formatDelta(skill.deltaPct), sub: "vs prior week" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border/50 bg-background p-3">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="mt-1 text-lg font-bold text-foreground tabular-nums">{s.value}</div>
                    <div className="text-[11px] text-muted-foreground">{s.sub}</div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="trend" className="pt-3">
              <ChartContainer config={trendConfig} className="h-[220px] aspect-auto">
                <LineChart data={timeline} accessibilityLayer margin={{ left: 0, right: 0 }}>
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
                    width={36}
                    tickFormatter={(v: number) => String(v)}
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
                  <Line
                    dataKey="n"
                    type="monotone"
                    stroke={CHART_COLORS[0]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="related" className="pt-3">
              {related.length === 0 ? (
                <EmptyState
                  icon={GitFork}
                  title="No co-occurrence data"
                  description="Not enough overlapping jobs to surface related skills for this one."
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {related.map((r) => (
                    <span
                      key={r.name}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                    >
                      <GitFork className="size-3 text-muted-foreground" />
                      {r.name}
                      <span className="text-muted-foreground tabular-nums">{formatNumber(r.n)}</span>
                    </span>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
}

export function SkillsTab({ data }: { data: MarketTrends }) {
  const { skills, meta } = data;
  const totalMentions = skills.reduce((s, k) => s + k.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Skills tracked", value: formatNumber(skills.length), sub: "top 30 by mentions", icon: Star, tone: "accent-blue" as const },
          { label: "Total mentions", value: formatNumber(totalMentions), sub: "across all top skills", icon: TrendingUp, tone: "accent-purple" as const },
          { label: "Jobs with skills", value: formatNumber(meta.totalJobs), sub: `${formatPct(sharePct(meta.totalJobs, meta.totalJobs))} of period jobs tagged`, icon: GitFork, tone: "accent-green" as const },
        ].map((s) => (
          <SectionCard key={s.label} icon={s.icon} title={s.label}>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
          </SectionCard>
        ))}
      </div>

      <SectionCard
        icon={TrendingUp}
        title="In-demand skills"
        subtitle="Sorted by mention volume — click a row to drill in"
      >
        <div className="overflow-hidden rounded-lg border border-border/60">
          <div className="hidden items-center gap-3 border-b border-border/60 bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground lg:flex">
            <span className="w-5" />
            <span className="w-44">Skill</span>
            <span className="flex-1">Share</span>
            <span className="w-14 text-right">% of jobs</span>
            <span className="w-20 text-right">Mentions</span>
            <span className="w-20 text-right">Recent</span>
            <span className="w-20 text-right">7-day trend</span>
          </div>
          {skills.map((skill, i) => (
            <SkillRow key={skill.name} skill={skill} index={i} data={data} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
