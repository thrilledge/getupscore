"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  Banknote,
  TrendingUp,
  TrendingDown,
  Users,
  Gem,
  UserPlus,
  Link2,
  Sparkles,
  FileText,
  Filter,
  Crown,
  ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  type ChartConfig,
} from "@/components/ui/chart";

interface RevenueData {
  ok: boolean;
  mrr: number;
  arr: number;
  mrrGrowth: number;
  activePro: number;
  totalFree: number;
  churned30d: number;
  churnRate: number;
  avgRevenuePerUser: number;
  ltv: number;
  monthlyRevenue: { month: string; revenue: number; subscribers: number }[];
  churnTrend: { month: string; churned: number; newSubs: number }[];
  conversionFunnel: {
    signedUp: number;
    haveProfile: number;
    ranAnalysis: number;
    generatedProposal: number;
    createdFilter: number;
    isPro: number;
    wasPro: number;
    last7dActive: number;
    last30dActive: number;
  };
  topPayingUsers: { email: string; plan: string; since: string; totalMonths: number }[];
  revenueForecast: { month: string; projected: number; conservative: number; optimistic: number }[];
}

const revenueConfig = {
  revenue: { label: "Revenue ($)", color: "#00C98B" },
  subscribers: { label: "Subscribers", color: "#00C98B" },
} satisfies ChartConfig;

const churnConfig = {
  churned: { label: "Churned", color: "#EF4444" },
  newSubs: { label: "New Subscribers", color: "#00C98B" },
} satisfies ChartConfig;

const funnelSteps = [
  { key: "signedUp", label: "Signed Up", icon: UserPlus },
  { key: "haveProfile", label: "Upwork Profile Connected", icon: Link2 },
  { key: "ranAnalysis", label: "Ran Job Analysis", icon: Sparkles },
  { key: "generatedProposal", label: "Generated Proposal", icon: FileText },
  { key: "createdFilter", label: "Created Filter", icon: Filter },
  { key: "isPro", label: "Converted to Pro", icon: Crown },
] as const;

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/revenue")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-white">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="bg-white">
              <CardContent className="p-5">
                <Skeleton className="h-[250px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Failed to load revenue data.</p>;

  const funnel = data.conversionFunnel;

  const stats = [
    {
      label: "MRR",
      value: `$${data.mrr.toLocaleString()}`,
      sub: `${data.activePro} active × $12`,
      icon: DollarSign,
      iconClass: "bg-green-500/10 text-green-600",
    },
    {
      label: "ARR",
      value: `$${data.arr.toLocaleString()}`,
      sub: `MRR × 12`,
      icon: Banknote,
      iconClass: "bg-blue-500/10 text-blue-600",
    },
    {
      label: "MRR Growth",
      value: `${data.mrrGrowth >= 0 ? "+" : ""}${data.mrrGrowth}%`,
      sub: "vs last month",
      icon: data.mrrGrowth >= 0 ? TrendingUp : TrendingDown,
      iconClass: data.mrrGrowth >= 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600",
      valueClass: data.mrrGrowth >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Active Pro",
      value: String(data.activePro),
      sub: `${data.totalFree} free users`,
      icon: Users,
      iconClass: "bg-orange-500/10 text-orange-600",
    },
    {
      label: "Churn Rate",
      value: `${data.churnRate}%`,
      sub: `${data.churned30d} churned (30d)`,
      icon: TrendingDown,
      iconClass: "bg-red-500/10 text-red-600",
    },
    {
      label: "LTV",
      value: `$${data.ltv.toLocaleString()}`,
      sub: `ARPU $${data.avgRevenuePerUser}`,
      icon: Gem,
      iconClass: "bg-purple-500/10 text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <div className={`grid size-8 place-items-center rounded-lg ${stat.iconClass}`}>
                  <stat.icon className="size-4" />
                </div>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${stat.valueClass ?? ""}`}>{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue Trend (12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueConfig} className="h-[250px] w-full">
              <AreaChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#999" }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 10, fill: "#999" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#00C98B"
                  fill="#00C98B"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  name="Revenue"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Churn Trend (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={churnConfig} className="h-[250px] w-full">
              <BarChart data={data.churnTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#999" }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 10, fill: "#999" }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="churned" fill="#EF4444" radius={[4, 4, 0, 0]} name="Churned" />
                <Bar dataKey="newSubs" fill="#00C98B" radius={[4, 4, 0, 0]} name="New Subscribers" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {funnelSteps.map((step, idx) => {
            const value = funnel[step.key];
            const prevValue = idx > 0 ? funnel[funnelSteps[idx - 1].key] : null;
            const pctOfSignup = funnel.signedUp > 0 ? (value / funnel.signedUp) * 100 : 0;
            const stepConversion =
              prevValue !== null && prevValue > 0 ? Math.round((value / prevValue) * 100) : null;
            const isFinal = step.key === "isPro";
            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className="flex w-52 shrink-0 items-center gap-2">
                  <step.icon className={`size-4 ${isFinal ? "text-green-600" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium truncate">{step.label}</span>
                </div>
                <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-gray-100">
                  <div
                    className="flex h-full items-center justify-end rounded-lg px-2 transition-all"
                    style={{
                      width: `${Math.max(pctOfSignup, 4)}%`,
                      backgroundColor: isFinal
                        ? "#00C98B"
                        : `rgba(0, 201, 139, ${Math.min(0.25 + idx * 0.12, 0.85)})`,
                    }}
                  >
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        pctOfSignup > 25 || isFinal ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {value.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="w-24 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {pctOfSignup.toFixed(1)}% of signups
                  {stepConversion !== null && (
                    <span className="ml-1 inline-flex items-center text-[10px]">
                      · {stepConversion}% <ArrowRight className="size-2.5" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>Was ever Pro: <strong className="text-gray-700">{funnel.wasPro}</strong></span>
            <span>Active last 7d: <strong className="text-gray-700">{funnel.last7dActive}</strong></span>
            <span>Active last 30d: <strong className="text-gray-700">{funnel.last30dActive}</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Forecast + Top Paying Users */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="size-4 text-green-600" />
              Revenue Forecast (next 3 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {data.revenueForecast.map((f) => (
                <div key={f.month} className="rounded-xl border p-4 text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{f.month}</p>
                  <p className="text-xl font-bold tabular-nums text-green-600">
                    ${f.projected.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">projected</p>
                  <div className="mt-3 space-y-1 border-t pt-2 text-xs tabular-nums">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Low</span>
                      <span>${f.conservative.toLocaleString()}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">High</span>
                      <span>${f.optimistic.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">
              Linear projection from the last 3 months of active subscribers × $12.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Top Paying Users ({data.topPayingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Plan</TableHead>
                  <TableHead className="text-xs">Since</TableHead>
                  <TableHead className="text-xs text-right">Tenure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topPayingUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                      No paying users yet
                    </TableCell>
                  </TableRow>
                )}
                {data.topPayingUsers.map((u) => (
                  <TableRow key={u.email}>
                    <TableCell className="max-w-[220px] truncate text-xs font-medium">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-green-500/20 bg-green-500/15 text-green-700">
                        {u.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(u.since).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {u.totalMonths} mo
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
