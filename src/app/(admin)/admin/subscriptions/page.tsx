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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Users, TrendingDown, CalendarX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  AreaChart,
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

interface Subscription {
  id: string;
  user_id: string;
  paddle_subscription_id: string;
  paddle_plan_id: string | null;
  status: string;
  current_period_end: string | null;
  created_at: string;
  email: string;
}

interface SubStats {
  ok: boolean;
  subscriptions: Subscription[];
  summary: {
    mrr: number;
    activePro: number;
    totalFree: number;
    canceled30d: number;
    churnRate: number;
  };
  charts: {
    dailyRevenue: { date: string; mrr: number; subscribers: number }[];
  };
}

const revenueConfig = {
  mrr: { label: "MRR ($)", color: "#00C98B" },
  subscribers: { label: "Subscribers", color: "#00C98B" },
} satisfies ChartConfig;

const statusColors: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 border-green-500/20",
  free: "bg-gray-500/15 text-gray-600 border-gray-500/20",
  canceled: "bg-red-500/15 text-red-600 border-red-500/20",
  past_due: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
  paused: "bg-orange-500/15 text-orange-600 border-orange-500/20",
};

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState<SubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ status: statusFilter });
    fetch(`/api/admin/subscriptions?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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

  if (!data) return <p className="text-muted-foreground">Failed to load subscriptions.</p>;

  const { summary: s, subscriptions, charts } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">MRR</p>
              <div className="grid size-8 place-items-center rounded-lg bg-green-500/10 text-green-600">
                <DollarSign className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">${s.mrr}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.activePro} active pro</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Active Pro</p>
              <div className="grid size-8 place-items-center rounded-lg bg-orange-500/10 text-orange-600">
                <Users className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{s.activePro}</p>
            <p className="mt-1 text-xs text-muted-foreground">subscribers</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Churned (30d)</p>
              <div className="grid size-8 place-items-center rounded-lg bg-red-500/10 text-red-600">
                <CalendarX className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{s.canceled30d}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.churnRate}% churn rate</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Free Users</p>
              <div className="grid size-8 place-items-center rounded-lg bg-gray-500/10 text-gray-600">
                <TrendingDown className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{s.totalFree}</p>
            <p className="mt-1 text-xs text-muted-foreground">non-paying</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Revenue Over Time (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueConfig} className="h-[250px] w-full">
            <AreaChart data={charts.dailyRevenue}>
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
                dataKey="mrr"
                stroke="#00C98B"
                fill="#00C98B"
                fillOpacity={0.15}
                strokeWidth={2}
                name="MRR"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              All Subscriptions ({subscriptions.length})
            </CardTitle>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Plan ID</TableHead>
                <TableHead className="text-xs">Period End</TableHead>
                <TableHead className="text-xs">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                    No subscriptions found
                  </TableCell>
                </TableRow>
              )}
              {subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="text-xs font-medium max-w-[200px] truncate">
                    {sub.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[sub.status] ?? ""}
                    >
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-[120px] truncate">
                    {sub.paddle_plan_id ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {sub.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(sub.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
