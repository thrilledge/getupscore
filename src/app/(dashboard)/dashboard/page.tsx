"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";

import {
  Filter,
  Briefcase,
  Bell,
  FileText,
  Activity,
  ArrowRight,
  Circle,
  Sparkles,
  Target,
  BarChart3,
  Zap,
  Heart,
  Brain,
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
    getValue: (s: StatusData | null) => s?.stats.active_filters ?? "—",
    getDesc: (s: StatusData | null) =>
      s && s.stats.active_filters > 0 ? `${s.stats.active_filters} filter(s) active` : "No filters yet",
  },
  {
    title: "Jobs Found",
    icon: Briefcase,
    color: "accent-green",
    getValue: (s: StatusData | null) => s?.stats.total_jobs ?? "—",
    getDesc: (s: StatusData | null) =>
      s && s.stats.recent_jobs_24h > 0 ? `${s.stats.recent_jobs_24h} new today` : "Today's matches",
  },
  {
    title: "Notifications",
    icon: Bell,
    color: "accent-amber",
    getValue: (s: StatusData | null) => s?.stats.active_rules ?? "—",
    getDesc: (s: StatusData | null) =>
      s && s.stats.active_rules > 0 ? `${s.stats.active_rules} rule(s) active` : "Alerts sent today",
  },
  {
    title: "Analyses",
    icon: BarChart3,
    color: "accent-purple",
    getValue: (s: StatusData | null) => s?.stats.total_analyses ?? "—",
    getDesc: (s: StatusData | null) =>
      s && s.stats.recent_analyses_24h > 0 ? `${s.stats.recent_analyses_24h} today` : "AI analyses run",
  },
];

const gettingStartedSteps = [
  {
    number: 1,
    title: "Create Job Filters",
    description: "Set up keywords, budget, and countries to find relevant jobs.",
    icon: Filter,
    href: "/filters",
    id: "filters",
  },
  {
    number: 2,
    title: "Add Notification Channels",
    description: "Connect Email, Telegram, Slack, or any custom channel.",
    icon: Bell,
    href: "/channels",
    id: "channels",
  },
  {
    number: 3,
    title: "Add Notification Rules",
    description: "Set up rules for when and how you want to be notified.",
    icon: Bell,
    href: "/rules",
    id: "rules",
  },
  {
    number: 4,
    title: "Get Alerts & Apply",
    description: "Receive scored job alerts and generate AI proposals.",
    icon: Zap,
    href: "/jobs",
    id: "jobs",
  },
];

const colorMap: Record<string, string> = {
  "accent-blue": "text-accent-blue bg-accent-blue/10",
  "accent-green": "text-accent-green bg-accent-green/10",
  "accent-amber": "text-accent-amber bg-accent-amber/10",
  "accent-purple": "text-accent-purple bg-accent-purple/10",
};

const iconBgMap: Record<string, string> = {
  "accent-blue": "bg-accent-blue/10 text-accent-blue group-hover:bg-accent-blue/20",
  "accent-green": "bg-accent-green/10 text-accent-green group-hover:bg-accent-green/20",
  "accent-amber": "bg-accent-amber/10 text-accent-amber group-hover:bg-accent-amber/20",
  "accent-purple": "bg-accent-purple/10 text-accent-purple group-hover:bg-accent-purple/20",
};

export default function DashboardPage() {
  const { user } = useUser();
  const displayName = user?.email?.split("@")[0] ?? "freelancer";
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [myStatsLoading, setMyStatsLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Fetch status for live stats
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/jobs/status");
        if (res.ok) {
          const data = await res.json();
          setStatusData(data);
        }
      } catch {
        // Silently fail — stats show fallback values
      } finally {
        setStatusLoading(false);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user-specific stats
  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        setMyStats(d);
        setMyStatsLoading(false);

        // Determine which steps are completed based on user data
        const completed = new Set<string>();
        if (d && d.activeFilters > 0) completed.add("filters");
        if (d && d.totalChannels > 0) completed.add("channels");
        if (d && d.activeRules > 0) completed.add("rules");
        if (d && d.totalNotifications > 0 || (d && d.totalProposals > 0)) completed.add("jobs");
        setCompletedSteps(completed);
      })
      .catch(() => setMyStatsLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-primary/80 p-8 text-primary-foreground shadow-lg">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.04]" />
        <div className="absolute -top-24 -right-24 size-64 rounded-full bg-primary-foreground/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 size-48 rounded-full bg-primary-foreground/5 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary-foreground/80" />
              <span className="text-sm font-medium text-primary-foreground/70 uppercase tracking-wider">
                Welcome back
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Hey, {displayName}! 👋
            </h1>
            <p className="text-base text-primary-foreground/80 max-w-xl">
              Your AI-powered Upwork command center. Track opportunities, manage filters, and generate winning proposals.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <div className="flex -space-x-2">
              {[Activity, Target, BarChart3].map((Icon, i) => (
                <div
                  key={i}
                  className="flex size-10 items-center justify-center rounded-full border-2 border-primary-foreground/20 bg-primary-foreground/10 backdrop-blur-sm"
                >
                  <Icon className="size-4 text-primary-foreground/80" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid — global */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {defaultStats.map((stat) => {
          const Icon = stat.icon;
          const iconStyle = iconBgMap[stat.color] || iconBgMap["accent-blue"];
          const valueColor = stat.color === "accent-blue" ? "text-accent-blue"
            : stat.color === "accent-green" ? "text-accent-green"
              : stat.color === "accent-amber" ? "text-accent-amber"
                : "text-accent-purple";

          return (
            <Card
              key={stat.title}
              className="group relative overflow-hidden border-border/60 bg-card transition-all duration-300 hover:shadow-lg hover:border-border/100 hover:-translate-y-0.5"
            >
              <div className="absolute right-0 top-0 size-24 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-primary/[0.03] to-transparent blur-2xl" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-xl p-2 transition-all duration-300 ${iconStyle}`}>
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold tracking-tight ${valueColor}`}>
                    {statusLoading ? "..." : stat.getValue(statusData)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.getDesc(statusData)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* My Activity — user-specific */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground font-heading tracking-wide uppercase">My Activity</h2>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Saved Jobs", value: myStats?.savedJobs ?? 0, icon: Heart, color: "text-red-500" },
            { label: "Analyses", value: myStats?.totalAnalyses ?? 0, icon: Brain, color: "text-accent-purple" },
            { label: "Filters", value: myStats?.activeFilters ?? 0, icon: Filter, color: "text-accent-blue" },
            { label: "Rules", value: myStats?.activeRules ?? 0, icon: Bell, color: "text-accent-green" },
            { label: "Proposals", value: myStats?.totalProposals ?? 0, icon: FileText, color: "text-accent-amber" },
            { label: "Notifications", value: myStats?.totalNotifications ?? 0, icon: Activity, color: "text-accent-purple" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="border-border/60">
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <Icon className={`size-5 shrink-0 ${s.color}`} />
                  <div>
                    <p className="text-lg font-bold">{myStatsLoading ? "..." : String(s.value)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Two-column layout: Getting Started + Cron Status */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Getting Started - takes 2 columns */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-heading font-semibold">
                  Getting Started
                </CardTitle>
                <CardDescription>
                  Follow these steps to start receiving job alerts
                </CardDescription>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <Circle className="size-2 fill-muted-foreground/40" />
                <span>{completedSteps.size} of {gettingStartedSteps.length} complete</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Vertical connector line */}

              <div className="space-y-0 relative">
                <div className="absolute left-[27px] top-[17px] bottom-2 w-px bg-gradient-to-b from-primary/30 via-primary/20 to-transparent" />
                {gettingStartedSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCompleted = completedSteps.has(step.id);

                  return (
                    <a
                      key={step.number}
                      href={step.href}
                      className="group relative flex items-start gap-5 px-2 py-4 rounded-xl transition-all duration-200 hover:bg-muted/50 cursor-pointer"
                    >
                      {/* Step number circle */}
                      <div className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-105 ${isCompleted
                        ? "border-accent-green bg-[#e5f7ed] text-accent-green"
                        : "border-primary/20 bg-background text-primary group-hover:border-primary/40"
                        }`}>
                        {isCompleted ? (
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <StepIcon className="size-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-heading font-semibold transition-colors ${isCompleted
                            ? "text-muted-foreground line-through"
                            : "text-foreground group-hover:text-primary"
                            }`}>
                            {step.title}
                          </h3>
                          <ArrowRight className="size-3.5 text-muted-foreground opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
                        </div>
                        <p className={`text-sm mt-0.5 ${isCompleted ? "text-muted-foreground/70" : "text-muted-foreground"
                          }`}>
                          {step.description}
                        </p>
                      </div>

                      {/* Status indicator */}
                      <div className="shrink-0 self-center">
                        {isCompleted ? (
                          <div className="flex size-6 items-center justify-center rounded-full bg-accent-green/10 text-accent-green">
                            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="flex size-6 items-center justify-center rounded-full border border-muted-foreground/20 text-muted-foreground/40">
                            <Circle className="size-3" />
                          </div>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Create Filter",
            description: "Define keywords, budget, and locations",
            icon: Filter,
            href: "/filters",
            gradient: "from-accent-blue/10 to-transparent",
            iconColor: "text-accent-blue",
          },
          {
            title: "Browse Jobs",
            description: "View latest scored opportunities",
            icon: Briefcase,
            href: "/jobs",
            gradient: "from-accent-green/10 to-transparent",
            iconColor: "text-accent-green",
          },
          {
            title: "View Proposals",
            description: "Manage AI-generated proposals",
            icon: FileText,
            href: "/proposals",
            gradient: "from-accent-purple/10 to-transparent",
            iconColor: "text-accent-purple",
          },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <a
              key={action.title}
              href={action.href}
              className="group relative flex items-center gap-4 rounded-xl border border-border/60 bg-card p-5 transition-all duration-300 hover:shadow-md hover:border-border/100 hover:-translate-y-0.5 cursor-pointer"
            >
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className={`relative z-10 rounded-xl p-2.5 bg-muted/50 ${action.iconColor} group-hover:bg-muted/80 transition-colors`}>
                <Icon className="size-5" />
              </div>
              <div className="relative z-10 flex-1">
                <p className="font-heading font-semibold text-sm group-hover:text-primary transition-colors">
                  {action.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {action.description}
                </p>
              </div>
              <ArrowRight className="relative z-10 size-4 text-muted-foreground opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
