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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Award,
  BarChart3,
  CalendarDays,
  FileText,
  Medal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface ProposalRow {
  id: string;
  email: string;
  jobTitle: string;
  score: number;
  status: string;
  createdAt: string;
}

interface ProposalsStats {
  ok: boolean;
  totalProposals: number;
  proposals24h: number;
  proposals7d: number;
  avgScore: number;
  medianScore: number;
  byStatus: { status: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
  topProposals: ProposalRow[];
  worstProposals: ProposalRow[];
  dailyProposals: { date: string; count: number; avgScore: number }[];
  perUserTop: {
    email: string;
    totalProposals: number;
    avgScore: number;
    bestScore: number;
  }[];
}

const distributionChartConfig = {
  count: { label: "Proposals", color: "#00C98B" },
} satisfies ChartConfig;

const dailyChartConfig = {
  count: { label: "Proposals", color: "#00C98B" },
  avgScore: { label: "Avg Score", color: "#8B5CF6" },
} satisfies ChartConfig;

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/15 text-gray-600 border-gray-500/20",
  generated: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  approved: "bg-[#00C98B]/15 text-emerald-700 border-[#00C98B]/20",
  sent: "bg-purple-500/15 text-purple-700 border-purple-500/20",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function AdminProposalsAnalyticsPage() {
  const [stats, setStats] = useState<ProposalsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/proposals-stats")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="bg-white">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-white">
          <CardContent className="p-5">
            <Skeleton className="h-[260px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return <p className="text-muted-foreground">Failed to load proposal analytics.</p>;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Total Proposals</p>
              <div className="grid size-8 place-items-center rounded-lg bg-[#00C98B]/10 text-[#00C98B]">
                <FileText className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{stats.totalProposals}</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Last 24h</p>
              <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
                <CalendarDays className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{stats.proposals24h}</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Last 7 Days</p>
              <div className="grid size-8 place-items-center rounded-lg bg-purple-500/10 text-purple-600">
                <BarChart3 className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{stats.proposals7d}</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Avg Score</p>
              <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{stats.avgScore}</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Median Score</p>
              <div className="grid size-8 place-items-center rounded-lg bg-gray-500/10 text-gray-600">
                <Medal className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{stats.medianScore}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Score Distribution */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={distributionChartConfig} className="h-[240px] w-full">
              <BarChart data={stats.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 10, fill: "#999" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "#999" }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill="#00C98B"
                  radius={[4, 4, 0, 0]}
                  name="Proposals"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Daily Proposals + Avg Score (dual axis) */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Proposals & Avg Score (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={dailyChartConfig} className="h-[240px] w-full">
              <ComposedChart data={stats.dailyProposals}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fontSize: 10, fill: "#999" }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: "#999" }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "#999" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  yAxisId="left"
                  dataKey="count"
                  fill="#00C98B"
                  radius={[3, 3, 0, 0]}
                  name="Proposals"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgScore"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={false}
                  name="Avg Score"
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top / Worst Proposals */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top 10 Best */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="size-4 text-[#00C98B]" />
              Top 10 Best Proposals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProposals.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No scored proposals yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Job Title</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topProposals.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Badge className="bg-[#00C98B] text-white hover:bg-[#00C98B] text-[10px] font-bold">
                          {p.score}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] max-w-[140px] truncate" title={p.email}>
                        {p.email.split("@")[0]}
                      </TableCell>
                      <TableCell className="text-[11px] max-w-[200px] truncate" title={p.jobTitle}>
                        {p.jobTitle}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {fmtDate(p.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Worst */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="size-4 text-red-500" />
              Top 10 Worst Proposals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.worstProposals.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No scored proposals yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Job Title</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.worstProposals.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] font-bold">
                          {p.score}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] max-w-[140px] truncate" title={p.email}>
                        {p.email.split("@")[0]}
                      </TableCell>
                      <TableCell className="text-[11px] max-w-[200px] truncate" title={p.jobTitle}>
                        {p.jobTitle}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {fmtDate(p.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-User Leaderboard */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Award className="size-4 text-[#00C98B]" />
            Per-User Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.perUserTop.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No proposal activity yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Total Proposals</TableHead>
                  <TableHead className="text-xs">Avg Score</TableHead>
                  <TableHead className="text-xs">Best Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.perUserTop.map((u, i) => (
                  <TableRow key={u.email}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="text-xs font-medium max-w-[250px] truncate" title={u.email}>
                      {u.email}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{u.totalProposals}</TableCell>
                    <TableCell className="text-xs font-mono font-medium">{u.avgScore}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-[#00C98B]/10 text-emerald-700 border-[#00C98B]/20 text-[10px] font-bold">
                        {u.bestScore}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
