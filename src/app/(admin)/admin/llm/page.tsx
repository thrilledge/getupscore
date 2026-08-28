"use client";

import { useEffect, useState, useCallback } from "react";
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
  Brain,
  Zap,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Hash,
  RefreshCw,
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

interface ProviderInfo {
  name: string;
  keys: number;
  model: string;
}

interface LlmStats {
  ok: boolean;
  range: string;
  overview: {
    totalCalls: number;
    rangeCalls: number;
    rangeTokens: number;
    rangePromptTokens: number;
    rangeCompletionTokens: number;
    successRate: number;
    errors: number;
  };
  chain: {
    providers: ProviderInfo[];
  };
  byProvider: { provider: string; calls: number; tokens: number }[];
  byEndpoint: { endpoint: string; calls: number; tokens: number }[];
  timeSeries: { date: string; tokens: number; calls: number }[];
  topUsers: { user_id: string; email: string; calls: number; tokens: number }[];
  rateLimits: { provider: string; count: number }[];
  recentCalls: {
    id: string;
    email: string;
    provider: string;
    model: string;
    endpoint: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    duration_ms: number | null;
    success: boolean;
    error_message: string | null;
    created_at: string;
  }[];
}

const RANGES = [
  { label: "15s", value: "15s" },
  { label: "30s", value: "30s" },
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "6h", value: "6h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
] as const;

const tokensChartConfig = {
  tokens: { label: "Tokens", color: "#00C98B" },
} satisfies ChartConfig;

const callsChartConfig = {
  calls: { label: "API Calls", color: "#3B82F6" },
} satisfies ChartConfig;

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const endpointColors: Record<string, string> = {
  proposal: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
  analysis: "bg-purple-500/15 text-purple-700 border-purple-500/20",
  chat: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  answer: "bg-amber-500/15 text-amber-700 border-amber-500/20",
};

function rangeLabel(r: string): string {
  const map: Record<string, string> = {
    "15s": "last 15 seconds",
    "30s": "last 30 seconds",
    "1m": "last minute",
    "5m": "last 5 minutes",
    "15m": "last 15 minutes",
    "1h": "last hour",
    "6h": "last 6 hours",
    "24h": "last 24 hours",
    "7d": "last 7 days",
    "30d": "last 30 days",
  };
  return map[r] ?? r;
}

export default function AdminLlmPage() {
  const [stats, setStats] = useState<LlmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<string>("24h");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/llm?range=${range}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  if (loading && !stats) {
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

  if (!stats) return <p className="text-muted-foreground">Failed to load LLM stats.</p>;

  const { overview: o, chain, byProvider, byEndpoint, timeSeries, topUsers, rateLimits, recentCalls } = stats;

  return (
    <div className="space-y-6">
      {/* Header with range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Brain className="size-5 text-[#00C98B]" />
            LLM Usage
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tracking {rangeLabel(range)} · {o.rangeCalls.toLocaleString()} calls
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                range === r.value
                  ? "bg-[#00C98B] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {r.label}
            </button>
          ))}
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`size-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* API Chain Configuration */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="size-4 text-[#00C98B]" />
            API Chain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {chain.providers.map((p) => (
              <div key={p.name} className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground mb-1">Provider</p>
                <p className="text-lg font-bold">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{p.model}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.keys} {p.keys === 1 ? "key" : "keys"} in rotation
                </p>
              </div>
            ))}
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">Rate Limits ({rangeLabel(range)})</p>
              {rateLimits.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {rateLimits.map((rl) => (
                    <Badge key={rl.provider} variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
                      {rl.provider}: {rl.count}× 429
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-lg font-bold text-[#00C98B]">None</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">API Calls ({range})</p>
              <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
                <Zap className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{o.rangeCalls.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">{o.totalCalls.toLocaleString()} total all-time</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Tokens ({range})</p>
              <div className="grid size-8 place-items-center rounded-lg bg-[#00C98B]/10 text-[#00C98B]">
                <Hash className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmtTokens(o.rangeTokens)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{fmtTokens(o.rangePromptTokens)} prompt · {fmtTokens(o.rangeCompletionTokens)} completion</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Avg Tokens/Call</p>
              <div className="grid size-8 place-items-center rounded-lg bg-purple-500/10 text-purple-600">
                <Activity className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {o.rangeCalls > 0 ? fmtTokens(Math.round(o.rangeTokens / o.rangeCalls)) : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">per API call</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Success Rate</p>
              <div className={`grid size-8 place-items-center rounded-lg ${o.successRate >= 95 ? "bg-[#00C98B]/10 text-[#00C98B]" : "bg-red-500/10 text-red-600"}`}>
                {o.successRate >= 95 ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{o.successRate}%</p>
            <p className="mt-1 text-xs text-muted-foreground">{o.errors} errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Token Usage ({rangeLabel(range)})</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={tokensChartConfig} className="h-[220px] w-full">
              <AreaChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#999" }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#999" }}
                  tickFormatter={(v: number) => fmtTokens(v)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="#00C98B"
                  fill="#00C98B"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  name="Tokens"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API Calls ({rangeLabel(range)})</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={callsChartConfig} className="h-[220px] w-full">
              <BarChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#999" }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis tick={{ fontSize: 10, fill: "#999" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="calls"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  name="Calls"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Provider + Endpoint Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* By Provider */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Usage by Provider ({rangeLabel(range)})</CardTitle>
          </CardHeader>
          <CardContent>
            {byProvider.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No API calls in range</p>
            ) : (
              <div className="space-y-3">
                {byProvider.map((p) => {
                  const maxTokens = Math.max(...byProvider.map((x) => x.tokens), 1);
                  const pct = Math.round((p.tokens / maxTokens) * 100);
                  return (
                    <div key={p.provider} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{p.provider}</span>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {p.calls} calls
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {fmtTokens(p.tokens)} tokens
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: "#00C98B",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Endpoint */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Usage by Endpoint ({rangeLabel(range)})</CardTitle>
          </CardHeader>
          <CardContent>
            {byEndpoint.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No API calls in range</p>
            ) : (
              <div className="space-y-3">
                {byEndpoint.map((e) => {
                  const maxTokens = Math.max(...byEndpoint.map((x) => x.tokens), 1);
                  const pct = Math.round((e.tokens / maxTokens) * 100);
                  return (
                    <div key={e.endpoint} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={endpointColors[e.endpoint] ?? "bg-gray-500/15 text-gray-600 border-gray-500/20"}
                          >
                            {e.endpoint}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {e.calls} calls
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {fmtTokens(e.tokens)} tokens
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#00C98B] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="size-4" />
            Top Users ({rangeLabel(range)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No user data in range</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Calls</TableHead>
                  <TableHead className="text-xs">Tokens</TableHead>
                  <TableHead className="text-xs">Avg/Call</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((u, i) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="text-xs font-medium max-w-[250px] truncate">{u.email}</TableCell>
                    <TableCell className="text-xs font-mono">{u.calls}</TableCell>
                    <TableCell className="text-xs font-mono font-medium">{fmtTokens(u.tokens)}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {u.calls > 0 ? fmtTokens(Math.round(u.tokens / u.calls)) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Calls */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="size-4" />
            Recent API Calls (last 50)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentCalls.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No API calls logged yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Provider</TableHead>
                    <TableHead className="text-xs">Endpoint</TableHead>
                    <TableHead className="text-xs">Prompt</TableHead>
                    <TableHead className="text-xs">Completion</TableHead>
                    <TableHead className="text-xs">Total</TableHead>
                    <TableHead className="text-xs">Duration</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCalls.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(c.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-[11px] max-w-[150px] truncate" title={c.email}>
                        {c.email === "—" ? "—" : c.email.split("@")[0]}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-[#00C98B]/10 text-[#00C98B] border-[#00C98B]/20"
                        >
                          {c.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${endpointColors[c.endpoint] ?? ""}`}
                        >
                          {c.endpoint}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-muted-foreground">
                        {fmtTokens(c.prompt_tokens)}
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-muted-foreground">
                        {fmtTokens(c.completion_tokens)}
                      </TableCell>
                      <TableCell className="text-[11px] font-mono font-medium">
                        {fmtTokens(c.total_tokens)}
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-muted-foreground">
                        {fmtDuration(c.duration_ms)}
                      </TableCell>
                      <TableCell>
                        {c.success ? (
                          <CheckCircle2 className="size-3.5 text-[#00C98B]" />
                        ) : (
                          <div title={c.error_message ?? ""}>
                            <XCircle className="size-3.5 text-red-500 cursor-help" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
