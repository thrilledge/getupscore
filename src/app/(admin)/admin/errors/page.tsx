"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertCircle,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  RotateCcw,
  Search,
  Server,
  ShieldAlert,
  XCircle,
} from "lucide-react";

interface ErrorLog {
  id: string;
  source: string;
  severity: string;
  message: string;
  stack: string | null;
  metadata: Record<string, unknown> | null;
  resolved: boolean;
  created_at: string;
}

interface ErrorsResponse {
  ok: boolean;
  errors: ErrorLog[];
  stats: {
    total: number;
    unresolvedCount: number;
    bySource: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const severityBadge: Record<string, string> = {
  info: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  warn: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
  error: "bg-red-500/15 text-red-700 border-red-500/20",
  critical: "bg-purple-500/15 text-purple-700 border-purple-500/20",
};

const sourceIcons: Record<string, typeof Globe> = {
  llm: Brain,
  api: Globe,
  cron: Server,
  auth: ShieldAlert,
};

export default function AdminErrorsPage() {
  const [data, setData] = useState<ErrorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [source, setSource] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [resolved, setResolved] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (source !== "all") params.set("source", source);
      if (severity !== "all") params.set("severity", severity);
      if (resolved !== "all") params.set("resolved", resolved);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/errors?${params.toString()}`);
      const json = await res.json();
      if (json.ok) setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [source, severity, resolved, search, page]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const toggleResolved = async (log: ErrorLog) => {
    setUpdatingId(log.id);
    try {
      const res = await fetch("/api/admin/errors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorId: log.id, resolved: !log.resolved }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                errors: prev.errors.map((e) =>
                  e.id === log.id ? { ...e, resolved: !e.resolved } : e
                ),
                stats: {
                  ...prev.stats,
                  unresolvedCount:
                    prev.stats.unresolvedCount + (log.resolved ? 1 : -1),
                },
              }
            : prev
        );
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = data?.stats;
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Total Errors</p>
              <div className="grid size-8 place-items-center rounded-lg bg-gray-500/10 text-gray-600">
                <AlertCircle className="size-4" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{stats?.total ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Unresolved</p>
              <div className={`grid size-8 place-items-center rounded-lg ${(stats?.unresolvedCount ?? 0) > 0 ? "bg-red-500/10 text-red-600" : "bg-[#00C98B]/10 text-[#00C98B]"}`}>
                <XCircle className="size-4" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{stats?.unresolvedCount ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">LLM Errors</p>
              <div className="grid size-8 place-items-center rounded-lg bg-purple-500/10 text-purple-600">
                <Brain className="size-4" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{stats?.bySource?.llm ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">API Errors</p>
              <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
                <Globe className="size-4" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{stats?.bySource?.api ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Critical</p>
              <div className="grid size-8 place-items-center rounded-lg bg-purple-500/10 text-purple-700">
                <ShieldAlert className="size-4" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{stats?.bySeverity?.critical ?? 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={source}
              onValueChange={(v) => { setSource(v ?? "all"); setPage(1); }}
            >
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {Object.keys(stats?.bySource ?? {}).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s} ({stats!.bySource[s]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={severity}
              onValueChange={(v) => { setSeverity(v ?? "all"); setPage(1); }}
            >
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={resolved}
              onValueChange={(v) => { setResolved(v ?? "all"); setPage(1); }}
            >
              <SelectTrigger className="h-9 w-[160px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="false">Unresolved</SelectItem>
                <SelectItem value="true">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search messages..."
                className="h-9 pl-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors Table */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="size-4 text-[#00C98B]" />
            Error Logs
            {pagination && (
              <span className="text-xs text-muted-foreground font-normal">
                ({pagination.total})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || data.errors.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No error logs match the current filters.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Time</TableHead>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs">Severity</TableHead>
                      <TableHead className="text-xs">Message</TableHead>
                      <TableHead className="text-xs text-center">Resolved</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.errors.map((log) => {
                      const SourceIcon = sourceIcons[log.source] ?? AlertCircle;
                      return (
                        <TableRow key={log.id} className={log.resolved ? "opacity-50" : ""}>
                          <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1 text-[10px]">
                              <SourceIcon className="size-3" />
                              {log.source}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] capitalize ${severityBadge[log.severity] ?? "bg-gray-500/15 text-gray-600 border-gray-500/20"}`}
                            >
                              {log.severity}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="text-[11px] max-w-[420px] truncate"
                            title={log.stack ? `${log.message}\n\n${log.stack}` : log.message}
                          >
                            {log.message}
                          </TableCell>
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={log.resolved}
                              onChange={() => toggleResolved(log)}
                              disabled={updatingId === log.id}
                              className="size-4 cursor-pointer accent-[#00C98B]"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] gap-1.5"
                              disabled={updatingId === log.id}
                              onClick={() => toggleResolved(log)}
                            >
                              {log.resolved ? (
                                <>
                                  <RotateCcw className="size-3" />
                                  Unresolve
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="size-3 text-[#00C98B]" />
                                  Resolve
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="size-3.5" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
