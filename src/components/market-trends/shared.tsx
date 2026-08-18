"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  deltaTone,
  formatDelta,
} from "@/lib/market-trends";

export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
  children,
}: {
  icon?: React.ComponentType<{
    className?: string;
  }>;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "group gap-0 overflow-hidden rounded-2xl border border-black/10 bg-white py-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-[#00C98B]/30 hover:shadow-[0_16px_40px_rgba(0,201,139,0.07)]",
        className
      )}
    >
      <CardHeader className="border-b border-black/5 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#00C98B]/20 bg-[#00C98B]/10 text-[#00C98B] transition-colors duration-300 group-hover:bg-[#00C98B] group-hover:text-[#0A0A0A]">
                <Icon className="size-4" />
              </div>
            ) : null}

            <div className="min-w-0 pt-0.5">
              <CardTitle className="truncate font-heading text-sm font-bold tracking-tight text-[#0A0A0A]">
                {title}
              </CardTitle>

              {subtitle ? (
                <CardDescription className="mt-1 text-[11px] leading-relaxed text-black/45">
                  {subtitle}
                </CardDescription>
              ) : null}
            </div>
          </div>

          {action ? (
            <div className="shrink-0">
              {action}
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {children}
      </CardContent>
    </Card>
  );
}

export function DeltaBadge({
  value,
  className,
}: {
  value: number | null;
  className?: string;
}) {
  const tone = deltaTone(value);

  if (tone === "new") {
    return (
      <span
        className={cn(
          "inline-flex h-6 items-center gap-1 rounded-full border border-[#00C98B]/20 bg-[#00C98B]/10 px-2 text-[10px] font-semibold text-[#007A56]",
          className
        )}
      >
        <Sparkles className="size-3" />
        New
      </span>
    );
  }

  const up = tone === "up";
  const flat = tone === "flat";

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-semibold tabular-nums",
        up &&
        "border-[#00C98B]/20 bg-[#00C98B]/10 text-[#007A56]",
        !up &&
        !flat &&
        "border-black/10 bg-black/5 text-black/55",
        flat &&
        "border-black/10 bg-white text-black/40",
        className
      )}
    >
      {up ? (
        <TrendingUp className="size-3" />
      ) : flat ? (
        <Minus className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}

      {value != null && value > 0
        ? "+"
        : ""}

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
  icon?: React.ComponentType<{
    className?: string;
  }>;
  tone?:
  | "accent-blue"
  | "accent-green"
  | "accent-amber"
  | "accent-purple";
}) {
  const toneMap = {
    "accent-blue":
      "border-[#00C98B]/20 bg-[#0A0A0A] text-[#00C98B]",

    "accent-green":
      "border-[#00C98B]/20 bg-[#00C98B]/10 text-[#00C98B]",

    "accent-amber":
      "border-black/10 bg-black/5 text-black/55",

    "accent-purple":
      "border-[#00C98B]/20 bg-[#00C98B]/10 text-[#007A56]",
  };

  return (
    <Card className="group h-full gap-0 overflow-hidden rounded-2xl border border-black/10 bg-white py-0 shadow-[0_8px_26px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/30 hover:shadow-[0_16px_36px_rgba(0,201,139,0.08)]">
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <CardTitle className="pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">
          {label}
        </CardTitle>

        {Icon ? (
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105",
              toneMap[tone]
            )}
          >
            <Icon className="size-4" />
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="font-heading text-2xl font-bold leading-none tracking-tight text-[#0A0A0A] tabular-nums">
          {value}
        </div>

        {sub ? (
          <div className="mt-2 text-[11px] leading-relaxed text-black/40">
            {sub}
          </div>
        ) : null}
      </CardContent>

      <div className="mt-auto h-0.5 w-full bg-gradient-to-r from-[#00C98B] via-[#00C98B]/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Card>
  );
}

export function Sparkline({
  data,
  dataKey = "n",
  color,
  height = 48,
}: {
  data: Array<
    Record<string, number | string>
  >;
  dataKey?: string;
  color: string;
  height?: number;
}) {
  return (
    <div
      style={{ height }}
      className="w-full min-w-0 overflow-hidden"
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
          data={data}
          margin={{
            top: 4,
            right: 4,
            bottom: 0,
            left: 4,
          }}
        >
          <YAxis
            hide
            domain={["dataMin", "dataMax"]}
          />

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 3,
              fill: "#00C98B",
              stroke: "#FFFFFF",
              strokeWidth: 2,
            }}
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
  icon: React.ComponentType<{
    className?: string;
  }>;
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex min-h-[260px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#00C98B]/30 bg-white px-5 py-12 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00C98B]/10 blur-3xl"
      />

      <div className="relative flex size-11 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#00C98B] shadow-[0_10px_24px_rgba(0,0,0,0.14)]">
        <Icon className="size-5" />
      </div>

      <h3 className="relative mt-4 font-heading text-sm font-bold text-[#0A0A0A]">
        {title}
      </h3>

      <p className="relative mt-1.5 max-w-sm text-[11px] leading-relaxed text-black/45">
        {description}
      </p>
    </div>
  );
}

export function ChartSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-4",
        className
      )}
    >
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white p-4 shadow-[0_8px_26px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36 bg-black/10" />
            <Skeleton className="h-3 w-24 bg-black/10" />
          </div>

          <Skeleton className="size-9 rounded-xl bg-[#00C98B]/10" />
        </div>

        <Skeleton className="h-[220px] w-full rounded-xl bg-black/5 sm:h-[260px]" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="rounded-2xl border border-black/10 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-3">
                <Skeleton className="h-3 w-20 bg-black/10" />
                <Skeleton className="h-7 w-24 bg-black/10" />
                <Skeleton className="h-3 w-16 bg-black/10" />
              </div>

              <Skeleton className="size-9 rounded-xl bg-[#00C98B]/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}