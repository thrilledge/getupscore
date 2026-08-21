"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bug,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  MessageSquare,
  Save,
  Sparkles,
} from "lucide-react";

interface FeedbackItem {
  id: string;
  user_id: string | null;
  user_email: string;
  category: string;
  rating: number | null;
  message: string;
  page_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface FeedbackResponse {
  ok: boolean;
  feedback: FeedbackItem[];
  stats: {
    total: number;
    new: number;
    reviewed: number;
    actioned: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const statusBadge: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  reviewed: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
  actioned: "bg-[#00C98B]/15 text-[#00C98B] border-[#00C98B]/20",
  dismissed: "bg-gray-500/15 text-gray-700 border-gray-500/20",
};

const categoryBadge: Record<string, string> = {
  bug: "bg-red-500/15 text-red-700 border-red-500/20",
  feature: "bg-purple-500/15 text-purple-700 border-purple-500/20",
  general: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  proposal_quality: "bg-[#00C98B]/15 text-[#00C98B] border-[#00C98B]/20",
};

const categoryIcons: Record<string, typeof Bug> = {
  bug: Bug,
  feature: Lightbulb,
  general: MessageSquare,
  proposal_quality: Sparkles,
};

export default function AdminFeedbackPage() {
  const [data, setData] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  // Per-item local state for notes + saving
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (category !== "all") params.set("category", category);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/admin/feedback?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setData(json);
        setNotesDrafts((prev) => {
          const next = { ...prev };
          json.feedback.forEach((f: FeedbackItem) => {
            if (!(f.id in next)) next[f.id] = f.admin_notes ?? "";
          });
          return next;
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [category, status, page]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const updateStatus = async (item: FeedbackItem, newStatus: string) => {
    setStatusUpdatingId(item.id);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId: item.id, status: newStatus }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                feedback: prev.feedback.map((f) =>
                  f.id === item.id ? { ...f, status: newStatus } : f
                ),
              }
            : prev
        );
      }
    } catch {
      // ignore
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const saveNotes = async (item: FeedbackItem) => {
    setSavingId(item.id);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackId: item.id,
          admin_notes: notesDrafts[item.id] ?? "",
        }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                feedback: prev.feedback.map((f) =>
                  f.id === item.id ? { ...f, admin_notes: notesDrafts[item.id] ?? "" } : f
                ),
              }
            : prev
        );
      }
    } catch {
      // ignore
    } finally {
      setSavingId(null);
    }
  };

  const stats = data?.stats;
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Total</p>
              <div className="grid size-8 place-items-center rounded-lg bg-gray-500/10 text-gray-600">
                <MessageSquare className="size-4" />
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
              <p className="text-xs font-medium text-muted-foreground">New</p>
              <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
                <Sparkles className="size-4" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{stats?.new ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Reviewed</p>
              <div className="grid size-8 place-items-center rounded-lg bg-yellow-500/10 text-yellow-600">
                <MessageSquare className="size-4" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{stats?.reviewed ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Actioned</p>
              <div className="grid size-8 place-items-center rounded-lg bg-[#00C98B]/10 text-[#00C98B]">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{stats?.actioned ?? 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={category}
              onValueChange={(v) => { setCategory(v ?? "all"); setPage(1); }}
            >
              <SelectTrigger className="h-9 w-[170px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="proposal_quality">Proposal Quality</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(v) => { setStatus(v ?? "all"); setPage(1); }}
            >
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="actioned">Actioned</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            {pagination && (
              <span className="text-xs text-muted-foreground ml-auto">
                {pagination.total} total
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : !data || data.feedback.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-8">
            <p className="text-xs text-muted-foreground text-center">
              No feedback matches the current filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.feedback.map((f) => {
            const CategoryIcon = categoryIcons[f.category] ?? MessageSquare;
            return (
              <Card key={f.id} className="bg-white">
                <CardContent className="p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`gap-1 text-[10px] capitalize ${categoryBadge[f.category] ?? categoryBadge.general}`}
                    >
                      <CategoryIcon className="size-3" />
                      {f.category.replace("_", " ")}
                    </Badge>

                    {/* Star rating */}
                    {typeof f.rating === "number" && f.rating >= 1 && f.rating <= 5 && (
                      <span className="text-xs tracking-wide" title={`${f.rating}/5`}>
                        {Array.from({ length: 5 }).map((_, i) => {
                          const rating: number = f.rating as number;
                          return (
                            <span key={i} className={i < rating ? "text-amber-400" : "text-gray-300"}>
                              ★
                            </span>
                          );
                        })}
                      </span>
                    )}

                    <span className="text-xs font-medium">{f.user_email}</span>

                    <span className="text-[11px] text-muted-foreground">
                      {new Date(f.created_at).toLocaleString()}
                    </span>

                    <div className="ml-auto flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize ${statusBadge[f.status] ?? statusBadge.new}`}
                      >
                        {f.status}
                      </Badge>
                      <Select
                        value={f.status}
                        onValueChange={(v) => updateStatus(f, v ?? "new")}
                        disabled={statusUpdatingId === f.id}
                      >
                        <SelectTrigger className="h-7 w-[120px] text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new" className="text-[11px]">New</SelectItem>
                          <SelectItem value="reviewed" className="text-[11px]">Reviewed</SelectItem>
                          <SelectItem value="actioned" className="text-[11px]">Actioned</SelectItem>
                          <SelectItem value="dismissed" className="text-[11px]">Dismissed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Message */}
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">
                    {f.message}
                  </p>

                  {/* Page URL */}
                  {f.page_url && (
                    <a
                      href={f.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#00C98B] hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      {f.page_url}
                    </a>
                  )}

                  {/* Admin notes */}
                  <div className="space-y-1.5 pt-1 border-t">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Admin Notes
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        value={notesDrafts[f.id] ?? ""}
                        onChange={(e) =>
                          setNotesDrafts((prev) => ({ ...prev, [f.id]: e.target.value }))
                        }
                        placeholder="Internal notes..."
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00C98B] disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto shrink-0 self-stretch px-3"
                        disabled={
                          savingId === f.id ||
                          (notesDrafts[f.id] ?? "") === (f.admin_notes ?? "")
                        }
                        onClick={() => saveNotes(f)}
                      >
                        <Save className={`size-3.5 ${savingId === f.id ? "animate-pulse" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
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
    </div>
  );
}
