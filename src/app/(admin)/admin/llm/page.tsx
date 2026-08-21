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
  Brain,
  Zap,
  Activity,
  AlertTriangle,
  Key,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Hash,
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

interface LlmStats {
  ok: boolean;
  overview: {
    totalCalls: number;
    calls24h: number;
    calls7d: number;
    tokensAllTime: number;
    promptTokens: number;
    completionTokens: number;
    tokens24h: number;
    tokens7d: number;
    successRate24h: number;
    errors24h: number;
  };
  chain: {
    provider: string;
    keyCount: number;
    model: string;
    keys: string[];
  };
  byProvider24h: { provider: string; calls: number; tokens: number }[];
  byEndpoint24h: { endpoint: string; calls: number; tokens: number }[];
  dailyTokens: { date: string; tokens: number; calls: number }[];
  topUsers: { user_id: string; email: string; calls: number; tokens: number }[];
  rateLimits24h: { provider: string; count: number }[];
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

export default function AdminLlmPage() {
  const [stats, setStats] = useState<LlmStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/llm")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
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

  const { overview: o, chain, byProvider24h, byEndpoint24h, dailyTokens, topUsers, rateLimits24h, recentCalls } = stats;

  return (
    <div className="space-y-6">
      {/* API Chain Status */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="size-4 text-[#00C98B]" />
            API Chain Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">Provider</p>
              <p className="text-lg font-bold">{chain.provider}</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{chain.model}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">Connected API Keys</p>
              <p className="text-lg font-bold text-[#00C98B]">{chain.keyCount}</p>
              <p className="text-xs text-muted-foreground mt-1">keys in rotation</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">Estimated Daily Quota</p>
              <p className="text-lg font-bold">~{fmtTokens(chain.keyCount * 144_000 * 2)}</p>
              <p className="text-xs text-muted-foreground mt-1">tokens (72K/key × 2)</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">Rate Limits (24h)</p>
              {rateLimits24h.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {rateLimits24h.map((rl) => (
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

          {/* Key names */}
          <div className="mt-4 flex flex-wrap gap-2">
            {chain.keys.map((key) => (
              <div key={key} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs">
                <Key className="size-3 text-[#00C98B]" />
                <span className="font-mono text-muted-foreground">{key}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Total API Calls</p>
              <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
                <Zap className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmtTokens(o.totalCalls)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{o.calls24h} in 24h · {o.calls7d} in 7d</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Total Tokens (30d)</p>
              <div className="grid size-8 place-items-center rounded-lg bg-[#00C98B]/10 text-[#00C98B]">
                <Hash className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmtTokens(o.tokensAllTime)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{fmtTokens(o.promptTokens)} prompt · {fmtTokens(o.completionTokens)} completion</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Tokens (24h)</p>
              <div className="grid size-8 place-items-center rounded-lg bg-purple-500/10 text-purple-600">
                <Activity className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmtTokens(o.tokens24h)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{fmtTokens(o.tokens7d)} in 7d</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Success Rate (24h)</p>
              <div className={`grid size-8 place-items-center rounded-lg ${o.successRate24h >= 95 ? "bg-[#00C98B]/10 text-[#00C98B]" : "bg-red-500/10 text-red-600"}`}>
                {o.successRate24h >= 95 ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{o.successRate24h}%</p>
            <p className="mt-1 text-xs text-muted-foreground">{o.errors24h} errors in 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Tokens Chart */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Token Usage (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={tokensChartConfig} className="h-[220px] w-full">
              <AreaChart data={dailyTokens}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fontSize: 10, fill: "#999" }}
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

        {/* Daily Calls Chart */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily API Calls (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={callsChartConfig} className="h-[220px] w-full">
              <BarChart data={dailyTokens}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fontSize: 10, fill: "#999" }}
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
        {/* By Provider (24h) */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Usage by API Key (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {byProvider24h.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No API calls in 24h</p>
            ) : (
              <div className="space-y-3">
                {byProvider24h.map((p) => {
                  const maxTokens = Math.max(...byProvider24h.map((x) => x.tokens), 1);
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

        {/* By Endpoint (24h) */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Usage by Endpoint (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {byEndpoint24h.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No API calls in 24h</p>
            ) : (
              <div className="space-y-3">
                {byEndpoint24h.map((e) => {
                  const maxTokens = Math.max(...byEndpoint24h.map((x) => x.tokens), 1);
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
            Top Users by Token Usage (7 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No user data in 7d</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">API Calls</TableHead>
                  <TableHead className="text-xs">Tokens Used</TableHead>
                  <TableHead className="text-xs">Avg Tokens/Call</TableHead>
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
                      <TableCell className="text-[11px] font-mono">{c.provider}</TableCell>
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
