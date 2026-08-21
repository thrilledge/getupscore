"use client";

import { useEffect, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Zap,
  Activity,
  Coffee,
  AlertTriangle,
  UserX,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Crown,
  CircleOff,
  Eye,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

interface AdminUserEnhanced {
  id: string;
  email: string;
  displayName: string;
  plan: string;
  segment: string;
  segmentScore: number;
  lastActiveAt: string | null;
  totalProposals: number;
  totalAnalyses: number;
  createdAt: string;
  lastSignIn: string | null;
}

interface SegmentStats {
  total: number;
  power: number;
  active: number;
  casual: number;
  at_risk: number;
  churned: number;
  new: number;
}

interface UsersResponse {
  ok: boolean;
  users: AdminUserEnhanced[];
  stats: SegmentStats;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const SEGMENT_STYLES: Record<
  string,
  { label: string; badge: string; bar: string }
> = {
  power: {
    label: "Power",
    badge: "bg-[#00C98B]/15 text-[#00C98B] border-[#00C98B]/20",
    bar: "#00C98B",
  },
  active: {
    label: "Active",
    badge: "bg-blue-500/15 text-blue-600 border-blue-500/20",
    bar: "#3B82F6",
  },
  casual: {
    label: "Casual",
    badge: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
    bar: "#EAB308",
  },
  at_risk: {
    label: "At Risk",
    badge: "bg-orange-500/15 text-orange-600 border-orange-500/20",
    bar: "#F97316",
  },
  churned: {
    label: "Churned",
    badge: "bg-red-500/15 text-red-600 border-red-500/20",
    bar: "#EF4444",
  },
  new: {
    label: "New",
    badge: "bg-gray-500/15 text-gray-600 border-gray-500/20",
    bar: "#6B7280",
  },
};

const statCards = [
  { key: "total", title: "Total Users", icon: Users, color: "bg-blue-500/10 text-blue-600" },
  { key: "power", title: "Power Users", icon: Zap, color: "bg-[#00C98B]/10 text-[#00C98B]" },
  { key: "active", title: "Active", icon: Activity, color: "bg-blue-500/10 text-blue-600" },
  { key: "casual", title: "Casual", icon: Coffee, color: "bg-yellow-500/10 text-yellow-600" },
  { key: "at_risk", title: "At-Risk", icon: AlertTriangle, color: "bg-orange-500/10 text-orange-600" },
  { key: "churned", title: "Churned", icon: UserX, color: "bg-red-500/10 text-red-600" },
] as const;

const NOW = Date.now();

export default function AdminUsersEnhancedPage() {
  const [users, setUsers] = useState<AdminUserEnhanced[]>([]);
  const [stats, setStats] = useState<SegmentStats>({
    total: 0,
    power: 0,
    active: 0,
    casual: 0,
    at_risk: 0,
    churned: 0,
    new: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshingSegments, setRefreshingSegments] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserEnhanced | null>(null);

  function fetchUsers(p: number, q: string, seg: string) {
    const params = new URLSearchParams({ page: String(p), per_page: "20" });
    if (q) params.set("search", q);
    if (seg !== "all") params.set("segment", seg);
    fetch(`/api/admin/users-enhanced?${params}`)
      .then((r) => r.json())
      .then((d: UsersResponse) => {
        if (d.ok) {
          setUsers(d.users);
          setStats(d.stats);
          setTotal(d.total);
          setTotalPages(d.totalPages);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchUsers(page, search, segmentFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, segmentFilter]);

  function handleSearch() {
    setLoading(true);
    setPage(1);
    fetchUsers(1, search, segmentFilter);
  }

  async function refreshSegments() {
    setRefreshingSegments(true);
    try {
      const res = await fetch("/api/admin/users-enhanced", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh_segments" }),
      });
      const d = await res.json();
      if (d.ok) {
        toast.success(d.message ?? "Segments refreshed");
        setLoading(true);
        fetchUsers(page, search, segmentFilter);
      } else {
        toast.error(d.error ?? "Failed to refresh segments");
      }
    } catch {
      toast.error("Failed to refresh segments");
    }
    setRefreshingSegments(false);
  }

  async function userAction(
    userId: string,
    action: "set_pro" | "set_free" | "send_password_reset"
  ) {
    setActingId(userId);
    try {
      const res = await fetch("/api/admin/users-enhanced", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const d = await res.json();
      if (!d.ok) {
        toast.error(d.error ?? "Action failed");
        return;
      }

      if (action === "send_password_reset") {
        if (d.actionLink) {
          await navigator.clipboard.writeText(d.actionLink).catch(() => {});
          toast.success("Reset link copied to clipboard");
        } else {
          toast.success(d.message ?? "Reset link generated");
        }
        return;
      }

      toast.success(d.message ?? "Done");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, plan: action === "set_pro" ? "pro" : "free" }
            : u
        )
      );
    } catch {
      toast.error("Action failed");
    } finally {
      setActingId(null);
    }
  }

  function formatRelative(dateStr: string | null): string {
    if (!dateStr) return "—";
    const diff = NOW - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => (
          <Card key={card.key} className="bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                <div className={`grid size-8 place-items-center rounded-lg ${card.color}`}>
                  <card.icon className="size-4" />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats[card.key]}</p>
              {card.key === "total" && (
                <p className="mt-1 text-xs text-muted-foreground">all registered</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Table */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">
              Users ({total})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-8 w-56 text-xs"
              />
              <Button size="sm" variant="outline" onClick={handleSearch} className="h-8">
                <Search className="size-3.5" />
              </Button>
              <Select value={segmentFilter} onValueChange={(v) => { setLoading(true); setSegmentFilter(v ?? "all"); setPage(1); }}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  {Object.entries(SEGMENT_STYLES).map(([key, s]) => (
                    <SelectItem key={key} value={key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={refreshSegments}
                disabled={refreshingSegments}
                className="h-8 border-[#00C98B]/30 text-[#00C98B] hover:bg-[#00C98B]/10 hover:text-[#00C98B]"
              >
                <RefreshCw className={`size-3.5 ${refreshingSegments ? "animate-spin" : ""}`} />
                Refresh Segments
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Plan</TableHead>
                    <TableHead className="text-xs">Segment</TableHead>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-xs">Proposals</TableHead>
                    <TableHead className="text-xs">Analyses</TableHead>
                    <TableHead className="text-xs">Last Active</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                  {users.map((u) => {
                    const seg = SEGMENT_STYLES[u.segment] ?? SEGMENT_STYLES.new;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="max-w-[200px] truncate text-xs font-medium">
                          {u.email}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">
                          {u.displayName || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={u.plan === "pro" ? "default" : "secondary"}
                            className={u.plan === "pro" ? "border-[#00C98B]/20 bg-[#00C98B]/15 text-[#00C98B]" : ""}
                          >
                            {u.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={seg.badge}>
                            {seg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.max(0, u.segmentScore))}%`,
                                  backgroundColor: seg.bar,
                                }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {u.segmentScore}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-muted-foreground">
                          {u.totalProposals}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-muted-foreground">
                          {u.totalAnalyses}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatRelative(u.lastActiveAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  disabled={actingId === u.id}
                                />
                              }
                            >
                              <MoreHorizontal className="size-3.5" />
                              <span className="sr-only">Open actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => userAction(u.id, "set_pro")}>
                                <Crown className="text-[#00C98B]" />
                                Make Pro
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => userAction(u.id, "set_free")}>
                                <CircleOff />
                                Make Free
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDetailUser(u)}>
                                <Eye />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => userAction(u.id, "send_password_reset")}>
                                <KeyRound />
                                Send Password Reset
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => { setLoading(true); setPage((p) => Math.max(1, p - 1)); }}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => { setLoading(true); setPage((p) => Math.min(totalPages, p + 1)); }}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailUser !== null} onOpenChange={(open) => !open && setDetailUser(null)}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">User Details</DialogTitle>
            <DialogDescription className="text-xs">
              Full profile and engagement breakdown
            </DialogDescription>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant={detailUser.plan === "pro" ? "default" : "secondary"}
                  className={detailUser.plan === "pro" ? "border-[#00C98B]/20 bg-[#00C98B]/15 text-[#00C98B]" : ""}
                >
                  {detailUser.plan}
                </Badge>
                <Badge
                  variant="outline"
                  className={(SEGMENT_STYLES[detailUser.segment] ?? SEGMENT_STYLES.new).badge}
                >
                  {(SEGMENT_STYLES[detailUser.segment] ?? SEGMENT_STYLES.new).label}
                </Badge>
              </div>
              <div className="divide-y rounded-lg border">
                {[
                  ["Email", detailUser.email],
                  ["Name", detailUser.displayName || "—"],
                  ["Engagement Score", String(detailUser.segmentScore)],
                  ["Proposals", String(detailUser.totalProposals)],
                  ["Analyses", String(detailUser.totalAnalyses)],
                  ["Last Active", formatRelative(detailUser.lastActiveAt)],
                  [
                    "Created",
                    new Date(detailUser.createdAt).toLocaleDateString(),
                  ],
                  [
                    "Last Sign In",
                    detailUser.lastSignIn
                      ? new Date(detailUser.lastSignIn).toLocaleDateString()
                      : "—",
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <span className="max-w-[220px] truncate text-xs">{value}</span>
                  </div>
                ))}
              </div>
              <p className="truncate font-mono text-[10px] text-muted-foreground">
                ID: {detailUser.id}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
