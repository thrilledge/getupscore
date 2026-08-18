"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Brain,
  Briefcase,
  Circle,
  FileText,
  Filter,
  Heart,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface StatusData {
  ok: boolean;
  stats: {
    total_jobs: number;
    recent_jobs_24h: number;
    total_analyses: number;
    recent_analyses_24h: number;
    active_filters: number;
    active_rules: number;
  };
}

interface MyStats {
  savedJobs: number;
  totalAnalyses: number;
  activeFilters: number;
  activeRules: number;
  totalProposals: number;
  totalNotifications: number;
}

const defaultStats = [
  {
    title: "Active Filters",
    icon: Filter,
    color: "accent-blue",

    getValue: (status: StatusData | null) =>
      status?.stats.active_filters ?? "—",

    getDesc: (status: StatusData | null) =>
      status && status.stats.active_filters > 0
        ? `${status.stats.active_filters} filter(s) active`
        : "No filters yet",
  },
  {
    title: "Jobs Found",
    icon: Briefcase,
    color: "accent-green",

    getValue: (status: StatusData | null) =>
      status?.stats.total_jobs ?? "—",

    getDesc: (status: StatusData | null) =>
      status && status.stats.recent_jobs_24h > 0
        ? `${status.stats.recent_jobs_24h} new today`
        : "Today's matches",
  },
  {
    title: "Notifications",
    icon: Bell,
    color: "accent-amber",

    getValue: (status: StatusData | null) =>
      status?.stats.active_rules ?? "—",

    getDesc: (status: StatusData | null) =>
      status && status.stats.active_rules > 0
        ? `${status.stats.active_rules} rule(s) active`
        : "Alerts sent today",
  },
  {
    title: "Analyses",
    icon: BarChart3,
    color: "accent-purple",

    getValue: (status: StatusData | null) =>
      status?.stats.total_analyses ?? "—",

    getDesc: (status: StatusData | null) =>
      status &&
      status.stats.recent_analyses_24h > 0
        ? `${status.stats.recent_analyses_24h} today`
        : "AI analyses run",
  },
];

const gettingStartedSteps = [
  {
    number: 1,
    title: "Create Job Filters",
    description:
      "Set up keywords, budget, and countries to find relevant jobs.",
    icon: Filter,
    href: "/filters",
    id: "filters",
  },
  {
    number: 2,
    title: "Add Notification Channels",
    description:
      "Connect Email, Telegram, Slack, or any custom channel.",
    icon: Bell,
    href: "/channels",
    id: "channels",
  },
  {
    number: 3,
    title: "Add Notification Rules",
    description:
      "Set up rules for when and how you want to be notified.",
    icon: Bell,
    href: "/rules",
    id: "rules",
  },
  {
    number: 4,
    title: "Get Alerts & Apply",
    description:
      "Receive scored job alerts and generate AI proposals.",
    icon: Zap,
    href: "/jobs",
    id: "jobs",
  },
];

const iconBgMap: Record<string, string> = {
  "accent-blue":
    "bg-[#00C98B]/10 text-[#00A975] group-hover:bg-[#00C98B]/15",

  "accent-green":
    "bg-[#00C98B]/10 text-[#00A975] group-hover:bg-[#00C98B]/15",

  "accent-amber":
    "bg-[#00C98B]/10 text-[#00A975] group-hover:bg-[#00C98B]/15",

  "accent-purple":
    "bg-[#00C98B]/10 text-[#00A975] group-hover:bg-[#00C98B]/15",
};

export default function DashboardPage() {
  const { user } = useUser();

  const displayName =
    user?.email?.split("@")[0] ?? "freelancer";

  const [statusData, setStatusData] =
    useState<StatusData | null>(null);

  const [statusLoading, setStatusLoading] =
    useState(true);

  const [myStats, setMyStats] =
    useState<MyStats | null>(null);

  const [myStatsLoading, setMyStatsLoading] =
    useState(true);

  const [completedSteps, setCompletedSteps] =
    useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(
          "/api/jobs/status"
        );

        if (response.ok) {
          const data = await response.json();
          setStatusData(data);
        }
      } catch {
        // Silently fail — stats show fallback values
      } finally {
        setStatusLoading(false);
      }
    };

    fetchStatus();

    const interval = setInterval(
      fetchStatus,
      60000
    );

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/analytics")
      .then((response) => response.json())
      .then((data) => {
        setMyStats(data);
        setMyStatsLoading(false);

        const completed = new Set<string>();

        if (data && data.activeFilters > 0) {
          completed.add("filters");
        }

        if (data && data.totalChannels > 0) {
          completed.add("channels");
        }

        if (data && data.activeRules > 0) {
          completed.add("rules");
        }

        if (
          (data && data.totalNotifications > 0) ||
          (data && data.totalProposals > 0)
        ) {
          completed.add("jobs");
        }

        setCompletedSteps(completed);
      })
      .catch(() => setMyStatsLoading(false));
  }, []);

  const completedPercentage =
    (completedSteps.size /
      gettingStartedSteps.length) *
    100;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-4 overflow-x-clip pb-6 sm:space-y-5 sm:pb-8 2xl:space-y-6">
      {/* Welcome Banner */}
      <section className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] text-white shadow-[0_16px_38px_rgba(0,0,0,0.14)] sm:rounded-[22px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden opacity-40 sm:block"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.08) 1px, transparent 1px)",

            backgroundSize: "44px 44px",

            maskImage:
              "linear-gradient(to right, transparent, black 45%, black)",

            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 45%, black)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-1/2 size-64 -translate-y-1/2 rounded-full bg-[#00C98B]/20 blur-[100px] transition-transform duration-700 group-hover:scale-110 sm:size-[300px]"
        />

        <div className="relative z-10 p-4 min-[480px]:p-5 sm:p-6 lg:px-7 lg:py-6 2xl:px-8 2xl:py-7">
          <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 max-w-2xl">
              <div className="mb-2 flex items-center gap-2 text-[#00C98B]">
                <Sparkles className="size-3.5 shrink-0 sm:size-4" />

                <span className="text-[10px] font-bold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.16em]">
                  Welcome back
                </span>
              </div>

              <h1 className="break-words font-heading text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-[32px]">
                Hey, {displayName}!
              </h1>

              <p className="mt-2 max-w-xl text-xs leading-5 text-white/55 sm:text-sm sm:leading-6">
                Your AI-powered Upwork command center.
                Track opportunities, manage filters, and
                generate winning proposals.
              </p>

              <Link
                href="/jobs"
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#00C98B]/45 bg-[#00C98B]/10 px-4 text-xs font-semibold text-[#00C98B] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B] hover:bg-[#00C98B] hover:text-[#0A0A0A] hover:shadow-[0_10px_28px_rgba(0,201,139,0.2)] min-[420px]:w-auto sm:text-sm"
              >
                <Briefcase className="size-3.5 sm:size-4" />
                View live jobs
                <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1 sm:size-4" />
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-2 md:self-center">
              {[Activity, Target, BarChart3].map(
                (Icon, index) => (
                  <div
                    key={index}
                    className="grid size-9 place-items-center rounded-xl border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#00C98B]/70 hover:bg-[#00C98B]/15 sm:size-10"
                  >
                    <Icon className="size-4 sm:size-[18px]" />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Global Stats */}
      <section className="grid min-w-0 grid-cols-1 gap-3 min-[430px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {defaultStats.map((stat) => {
          const Icon = stat.icon;

          const iconStyle =
            iconBgMap[stat.color] ||
            iconBgMap["accent-green"];

          return (
            <Card
              key={stat.title}
              className="group relative min-w-0 gap-0 overflow-hidden rounded-xl border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_6px_20px_rgba(0,0,0,0.035)] transition-all duration-300 hover:-translate-y-1 hover:border-[#00C98B]/35 hover:shadow-[0_14px_30px_rgba(0,201,139,0.08)] sm:rounded-2xl"
            >
              <div className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-[#00C98B] transition-transform duration-300 group-hover:scale-x-100" />

              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-4 pb-0 pt-4">
                <CardTitle className="min-w-0 truncate text-[11px] font-semibold text-[#0A0A0A]/55 sm:text-[13px]">
                  {stat.title}
                </CardTitle>

                <div
                  className={`grid size-8 shrink-0 place-items-center rounded-lg transition-all duration-300 group-hover:scale-105 sm:size-9 sm:rounded-xl ${iconStyle}`}
                >
                  <Icon className="size-4 sm:size-[18px]" />
                </div>
              </CardHeader>

              <CardContent className="px-4 pb-4 pt-2">
                <p className="break-all font-heading text-xl font-bold leading-none tracking-tight text-[#0A0A0A] tabular-nums sm:text-2xl">
                  {statusLoading
                    ? "..."
                    : stat.getValue(statusData)}
                </p>

                <p className="mt-2 truncate text-[10px] text-[#0A0A0A]/45 sm:text-[11px]">
                  {stat.getDesc(statusData)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* My Activity */}
      <section className="min-w-0 space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="size-3.5 shrink-0 text-[#00A975] sm:size-4" />

          <h2 className="shrink-0 font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-[#0A0A0A]/55 sm:text-xs sm:tracking-[0.15em]">
            My Activity
          </h2>

          <span className="h-px min-w-0 flex-1 bg-[#0A0A0A]/10" />
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2.5 min-[540px]:grid-cols-3 sm:gap-3 xl:grid-cols-6">
          {[
            {
              label: "Saved Jobs",
              value: myStats?.savedJobs ?? 0,
              icon: Heart,
            },
            {
              label: "Analyses",
              value: myStats?.totalAnalyses ?? 0,
              icon: Brain,
            },
            {
              label: "Filters",
              value: myStats?.activeFilters ?? 0,
              icon: Filter,
            },
            {
              label: "Rules",
              value: myStats?.activeRules ?? 0,
              icon: Bell,
            },
            {
              label: "Proposals",
              value: myStats?.totalProposals ?? 0,
              icon: FileText,
            },
            {
              label: "Notifications",
              value:
                myStats?.totalNotifications ?? 0,
              icon: Activity,
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <Card
                key={stat.label}
                className="group min-w-0 gap-0 rounded-xl border border-[#0A0A0A]/10 bg-white py-0 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/35 hover:shadow-[0_10px_24px_rgba(0,201,139,0.07)] sm:rounded-2xl"
              >
                <CardContent className="flex min-w-0 items-center gap-2.5 px-3 py-3 sm:gap-3 sm:px-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#00C98B]/10 text-[#00A975] transition-all duration-300 group-hover:bg-[#00C98B] group-hover:text-[#0A0A0A] sm:size-9 sm:rounded-xl">
                    <Icon className="size-4 sm:size-[18px]" />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate font-heading text-sm font-bold leading-none text-[#0A0A0A] tabular-nums sm:text-base">
                      {myStatsLoading
                        ? "..."
                        : String(stat.value)}
                    </p>

                    <p className="mt-1 truncate text-[8px] font-medium uppercase tracking-wide text-[#0A0A0A]/45 sm:text-[9px] sm:tracking-wider">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Getting Started */}
      <Card className="min-w-0 gap-0 overflow-hidden rounded-2xl border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_8px_26px_rgba(0,0,0,0.035)] sm:rounded-[22px]">
        <CardHeader className="border-b border-[#0A0A0A]/10 px-4 py-4 sm:px-5 md:px-6">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <CardTitle className="font-heading text-base font-bold text-[#0A0A0A] sm:text-lg">
                Getting Started
              </CardTitle>

              <CardDescription className="text-xs leading-relaxed text-[#0A0A0A]/50 sm:text-sm">
                Follow these steps to start receiving job
                alerts
              </CardDescription>
            </div>

            <div className="w-full shrink-0 sm:w-[230px] md:w-[260px] lg:w-[280px]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold text-[#0A0A0A]/45 sm:text-[11px]">
                  Setup progress
                </span>

                <span className="text-[10px] font-semibold text-[#00A975] sm:text-[11px]">
                  {completedSteps.size} of{" "}
                  {gettingStartedSteps.length}
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-[#0A0A0A]/10">
                <div
                  className="h-full rounded-full bg-[#00C98B] transition-[width] duration-700 ease-out"
                  style={{
                    width: `${completedPercentage}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-3 py-2 sm:px-4 md:px-5">
          <div className="relative min-w-0">
            <div className="absolute bottom-6 left-[23px] top-6 w-px bg-[#00C98B]/25 sm:left-[27px]" />

            <div className="relative">
              {gettingStartedSteps.map((step) => {
                const StepIcon = step.icon;

                const isCompleted =
                  completedSteps.has(step.id);

                return (
                  <a
                    key={step.number}
                    href={step.href}
                    className="group relative flex min-w-0 items-start gap-3 rounded-xl px-1 py-3 transition-all duration-300 hover:bg-[#00C98B]/5 min-[480px]:gap-3.5 min-[480px]:px-1.5 sm:items-center"
                  >
                    <div
                      className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-lg border transition-all duration-300 group-hover:scale-105 sm:size-10 sm:rounded-xl ${
                        isCompleted
                          ? "border-[#00C98B] bg-[#00C98B] text-[#0A0A0A]"
                          : "border-[#00C98B]/25 bg-white text-[#00A975] group-hover:border-[#00C98B]/60 group-hover:bg-[#00C98B]/10"
                      }`}
                    >
                      {isCompleted ? (
                        <svg
                          className="size-3.5 sm:size-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <StepIcon className="size-3.5 sm:size-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3
                          className={`min-w-0 truncate font-heading text-xs font-semibold transition-colors sm:text-sm ${
                            isCompleted
                              ? "text-[#0A0A0A]/45 line-through"
                              : "text-[#0A0A0A] group-hover:text-[#00A975]"
                          }`}
                        >
                          {step.title}
                        </h3>

                        <ArrowRight className="hidden size-3.5 shrink-0 -translate-x-2 text-[#00A975] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 min-[480px]:block" />
                      </div>

                      <p
                        className={`mt-1 line-clamp-2 text-[10px] leading-4 min-[480px]:text-[11px] sm:line-clamp-none sm:text-xs sm:leading-5 ${
                          isCompleted
                            ? "text-[#0A0A0A]/35"
                            : "text-[#0A0A0A]/50"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>

                    <div className="hidden shrink-0 md:block">
                      {isCompleted ? (
                        <span className="grid size-6 place-items-center rounded-full bg-[#00C98B]/10 text-[#00A975]">
                          <svg
                            className="size-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </span>
                      ) : (
                        <span className="grid size-6 place-items-center rounded-full border border-[#0A0A0A]/10 text-[#0A0A0A]/25 transition-colors group-hover:border-[#00C98B]/40 group-hover:text-[#00A975]">
                          <Circle className="size-3" />
                        </span>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <section className="grid min-w-0 grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3 sm:gap-4">
        {[
          {
            title: "Create Filter",
            description:
              "Define keywords, budget, and locations",
            icon: Filter,
            href: "/filters",
          },
          {
            title: "Browse Jobs",
            description:
              "View latest scored opportunities",
            icon: Briefcase,
            href: "/jobs",
          },
          {
            title: "View Proposals",
            description:
              "Manage AI-generated proposals",
            icon: FileText,
            href: "/proposals",
          },
        ].map((action) => {
          const Icon = action.icon;

          return (
            <a
              key={action.title}
              href={action.href}
              className="group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-[#0A0A0A]/10 bg-white p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-[#00C98B]/35 hover:shadow-[0_14px_30px_rgba(0,201,139,0.08)] sm:gap-3.5 sm:rounded-2xl sm:p-4"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-[#00C98B]/0 blur-2xl transition-colors duration-300 group-hover:bg-[#00C98B]/10" />

              <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-lg bg-[#00C98B]/10 text-[#00A975] transition-all duration-300 group-hover:bg-[#00C98B] group-hover:text-[#0A0A0A] sm:size-10 sm:rounded-xl">
                <Icon className="size-4 sm:size-[18px]" />
              </span>

              <div className="relative z-10 min-w-0 flex-1">
                <p className="truncate font-heading text-xs font-bold text-[#0A0A0A] transition-colors group-hover:text-[#00A975] sm:text-sm">
                  {action.title}
                </p>

                <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-[#0A0A0A]/45 sm:text-xs sm:leading-5">
                  {action.description}
                </p>
              </div>

              <ArrowRight className="relative z-10 hidden size-4 shrink-0 -translate-x-2 text-[#00A975] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 min-[420px]:block" />
            </a>
          );
        })}
      </section>
    </div>
  );
}