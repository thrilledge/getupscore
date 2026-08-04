"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { deltaTone, formatDelta } from "@/lib/market-trends";

export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("border-border/60 bg-card", className)}>
      <CardHeader className="[.border-b]:pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {Icon ? (
              <div className="rounded-xl bg-accent-blue/10 p-2">
                <Icon className="size-4 text-accent-blue" />
              </div>
            ) : null}
            <div>
              <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
              {subtitle ? <CardDescription className="mt-0.5 text-xs">{subtitle}</CardDescription> : null}
            </div>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function DeltaBadge({ value, className }: { value: number | null; className?: string }) {
  const tone = deltaTone(value);
  if (tone === "new") {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-accent-blue/10 px-2 py-0.5 text-[11px] font-medium text-accent-blue", className)}>
        <Sparkles className="size-3" />
        new
      </span>
    );
  }
  const up = tone === "up";
  const flat = tone === "flat";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        up && "bg-accent-green/10 text-accent-green",
        !up && !flat && "bg-red-500/10 text-red-400",
        flat && "bg-muted text-muted-foreground",
        className
      )}
    >
      {up ? <TrendingUp className="size-3" /> : flat ? <Minus className="size-3" /> : <TrendingDown className="size-3" />}
      {value != null && value > 0 ? "+" : ""}
      {formatDelta(value)}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "accent-blue",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "accent-blue" | "accent-green" | "accent-amber" | "accent-purple";
}) {
  const toneMap = {
    "accent-blue": "bg-accent-blue/10 text-accent-blue",
    "accent-green": "bg-accent-green/10 text-accent-green",
    "accent-amber": "bg-accent-amber/10 text-accent-amber",
    "accent-purple": "bg-accent-purple/10 text-accent-purple",
  };
  return (
    <Card className="border-border/60 bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon ? (
          <div className={cn("rounded-xl p-2", toneMap[tone])}>
            <Icon className="size-4" />
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</div>
        {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

export function Sparkline({
  data,
  dataKey = "n",
  color,
  height = 48,
}: {
  data: Array<Record<string, number | string>>;
  dataKey?: string;
  color: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
      <div className="rounded-2xl bg-muted p-3">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-[260px] w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
