"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Clock,
  Filter,
  Bell,
  Briefcase,
  Brain,
} from "lucide-react";

interface StatusData {
  ok: boolean;
  timestamp: string;
  stats: {
    total_jobs: number;
    recent_jobs_24h: number;
    total_analyses: number;
    recent_analyses_24h: number;
    active_filters: number;
    active_rules: number;
  };
  last_analysis: string | null;
}

export function DashboardCronStatus() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/jobs/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const lastAnalysisTime = status?.last_analysis
    ? formatTimeAgo(new Date(status.last_analysis).getTime())
    : "Never";

  const isFresh = status?.last_analysis
    ? Date.now() - new Date(status.last_analysis).getTime() < 3600000
    : false;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-accent-green/10 p-2">
              <Activity className="size-4 text-accent-green" />
            </div>
            <div>
              <CardTitle className="text-base font-heading font-semibold">
                Monitoring Status
              </CardTitle>
              <CardDescription>
                Server-side cron job activity
              </CardDescription>
            </div>
          </div>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Failed to load status: {error}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top-level status indicator */}
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
              isFresh
                ? "bg-accent-green/10 text-accent-green"
                : status ? "bg-accent-amber/10 text-accent-amber" : "bg-muted/50 text-muted-foreground"
            }`}>
              {isFresh ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <Clock className="size-4 shrink-0" />
              )}
              <span className="font-medium">
                {status
                  ? isFresh
                    ? "Cron is active — jobs analyzed within last hour"
                    : `Last analysis: ${lastAnalysisTime}`
                  : loading
                    ? "Loading status..."
                    : "No data yet"}
              </span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <StatItem icon={Briefcase} label="Total Jobs" value={status?.stats.total_jobs ?? 0} color="text-accent-blue" />
              <StatItem icon={Filter} label="Active Filters" value={status?.stats.active_filters ?? 0} color="text-accent-green" />
              <StatItem icon={Bell} label="Active Rules" value={status?.stats.active_rules ?? 0} color="text-accent-amber" />
              <StatItem icon={Brain} label="Analyses" value={status?.stats.total_analyses ?? 0} color="text-accent-purple" />
              <StatItem icon={BarChart3} label="24h Jobs" value={status?.stats.recent_jobs_24h ?? 0} color="text-accent-blue" />
              <StatItem icon={Activity} label="24h Analyses" value={status?.stats.recent_analyses_24h ?? 0} color="text-accent-green" />
            </div>

            {/* Last check timestamp */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
              <span>System check: {status ? new Date(status.timestamp).toLocaleString() : "—"}</span>
              <span className="font-mono">{status?.stats.total_jobs ?? 0} jobs</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
      <Icon className={`size-4 mb-1 ${color}`} />
      <span className="text-lg font-bold">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
