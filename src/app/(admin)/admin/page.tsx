"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  CreditCard,
  DollarSign,
  Briefcase,
  FileText,
  Filter,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface AdminStats {
  ok: boolean;
  overview: {
    totalUsers: number;
    recentUsers7d: number;
    activePro: number;
    totalFree: number;
    mrr: number;
    canceled30d: number;
    totalJobs: number;
    jobs24h: number;
    totalAnalyses: number;
    analyses24h: number;
    activeFilters: number;
    activeRules: number;
  };
  charts: {
    dailySignups: { date: string; count: number }[];
    dailyJobs: { date: string; count: number }[];
    dailyProposals: { date: string; count: number }[];
  };
  recent: {
    signups: { email: string; displayName: string; createdAt: string; plan: string }[];
    jobs: { title: string; created_at: string }[];
  };
}

const signupConfig = {
  signups: { label: "Signups", color: "#00C98B" },
} satisfies ChartConfig;

const jobsConfig = {
  jobs: { label: "Jobs", color: "#00C98B" },
} satisfies ChartConfig;

const proposalsConfig = {
  proposals: { label: "Proposals", color: "#8B5CF6" },
} satisfies ChartConfig;

const pieConfig = {
  pro: { label: "Pro", color: "#00C98B" },
  free: { label: "Free", color: "#6B7280" },
} satisfies ChartConfig;

const ACCENT = "#00C98B";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-white">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return <p className="text-muted-foreground">Failed to load stats.</p>;

  const { overview: o, charts: c, recent: r } = stats;

  const statCards = [
    { title: "Total Users", value: o.totalUsers, sub: `+${o.recentUsers7d} this week`, icon: Users, color: "bg-blue-500/10 text-blue-600" },
    { title: "Active Subscribers", value: o.activePro, sub: "Pro users", icon: CreditCard, color: "bg-orange-500/10 text-orange-600" },
    { title: "MRR", value: `$${o.mrr}`, sub: `${o.activePro} × $12/mo`, icon: DollarSign, color: "bg-green-500/10 text-green-600" },
    { title: "Free Users", value: o.totalFree, sub: `${o.canceled30d} canceled (30d)`, icon: Users, color: "bg-gray-500/10 text-gray-600" },
    { title: "Jobs Ingested", value: o.totalJobs, sub: `${o.jobs24h} in 24h`, icon: Briefcase, color: "bg-emerald-500/10 text-emerald-600" },
    { title: "Proposals", value: o.totalAnalyses, sub: `${o.analyses24h} in 24h`, icon: FileText, color: "bg-purple-500/10 text-purple-600" },
  ];

  const pieData = [
    { name: "Pro", value: o.activePro, fill: "#00C98B" },
    { name: "Free", value: o.totalFree, fill: "#6B7280" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => (
          <Card key={card.title} className="bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                <div className={`grid size-8 place-items-center rounded-lg ${card.color}`}>
                  <card.icon className="size-4" />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* User Signups Chart */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">User Signups (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={signupConfig} className="h-[220px] w-full">
              <AreaChart data={c.dailySignups}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fontSize: 10, fill: "#999" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "#999" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="signups"
                  stroke="#00C98B"
                  fill="#00C98B"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  name="signups"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Jobs Ingested Chart */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jobs Ingested (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={jobsConfig} className="h-[220px] w-full">
              <BarChart data={c.dailyJobs}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fontSize: 10, fill: "#999" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "#999" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="jobs"
                  fill="#00C98B"
                  radius={[4, 4, 0, 0]}
                  name="jobs"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Proposals Chart */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Proposals Generated (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={proposalsConfig} className="h-[220px] w-full">
              <BarChart data={c.dailyProposals}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fontSize: 10, fill: "#999" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "#999" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="proposals"
                  fill="#8B5CF6"
                  radius={[4, 4, 0, 0]}
                  name="proposals"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Subscription Distribution Pie */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subscription Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pieConfig} className="h-[220px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#00C98B]" />
                <span className="text-xs text-muted-foreground">Pro ({o.activePro})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#6B7280]" />
                <span className="text-xs text-muted-foreground">Free ({o.totalFree})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Signups */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {r.signups.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No signups yet</p>
              )}
              {r.signups.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.displayName || s.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={s.plan === "pro" ? "default" : "secondary"}
                      className={s.plan === "pro" ? "bg-[#00C98B]/15 text-[#00C98B] border-[#00C98B]/20" : ""}
                    >
                      {s.plan}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {r.jobs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No jobs yet</p>
              )}
              {r.jobs.map((j, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm font-medium truncate min-w-0">{j.title}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 ml-3">
                    {new Date(j.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
