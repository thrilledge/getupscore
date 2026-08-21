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
  Activity,
  Briefcase,
  BarChart3,
  Filter,
  Bell,
  AlertTriangle,
  Clock,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SystemData {
  ok: boolean;
  totalJobs: number;
  jobs24h: number;
  totalAnalyses: number;
  analyses24h: number;
  activeFilters: number;
  activeRules: number;
  lastAnalysis: string | null;
  jobSources: Record<string, number>;
  proposals24h: number;
}

export default function AdminSystemPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/system")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d); })
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

  if (!data) return <p className="text-muted-foreground">Failed to load system data.</p>;

  const statCards = [
    { title: "Total Jobs", value: data.totalJobs, sub: `${data.jobs24h} in 24h`, icon: Briefcase, color: "bg-emerald-500/10 text-emerald-600" },
    { title: "Total Analyses", value: data.totalAnalyses, sub: `${data.analyses24h} in 24h`, icon: BarChart3, color: "bg-purple-500/10 text-purple-600" },
    { title: "Active Filters", value: data.activeFilters, sub: "user filters", icon: Filter, color: "bg-blue-500/10 text-blue-600" },
    { title: "Active Rules", value: data.activeRules, sub: "notification rules", icon: Bell, color: "bg-amber-500/10 text-amber-600" },
  ];

  const timeSince = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="bg-white">
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

      {/* System Status */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Health Indicators */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Activity className="size-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Last Analysis</p>
                    <p className="text-xs text-muted-foreground">{timeSince(data.lastAnalysis)}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={data.lastAnalysis
                    ? "bg-green-500/15 text-green-700 border-green-500/20"
                    : "bg-red-500/15 text-red-700 border-red-500/20"
                  }
                >
                  {data.lastAnalysis ? "Healthy" : "No data"}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Zap className="size-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Proposals (24h)</p>
                    <p className="text-xs text-muted-foreground">generated today</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={data.proposals24h > 0
                    ? "bg-green-500/15 text-green-700 border-green-500/20"
                    : "bg-yellow-500/15 text-yellow-700 border-yellow-500/20"
                  }
                >
                  {data.proposals24h}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Clock className="size-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Job Ingestion</p>
                    <p className="text-xs text-muted-foreground">{data.jobs24h} jobs in last 24h</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={data.jobs24h > 0
                    ? "bg-green-500/15 text-green-700 border-green-500/20"
                    : "bg-yellow-500/15 text-yellow-700 border-yellow-500/20"
                  }
                >
                  {data.jobs24h > 0 ? "Active" : "Idle"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Sources */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Job Sources (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(data.jobSources).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No jobs in last 24h</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data.jobSources)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between rounded-lg border px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-2 rounded-full bg-[#00C98B]" />
                        <p className="text-sm font-medium capitalize">{source}</p>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {count}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
