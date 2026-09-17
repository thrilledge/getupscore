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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";

interface ReviewItem {
  id: string;
  name: string;
  role: string | null;
  rating: number;
  message: string;
  status: string;
  created_at: string;
}

interface ReviewsResponse {
  ok: boolean;
  reviews: ReviewItem[];
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const statusBadge: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
  approved: "bg-[#00C98B]/15 text-[#00C98B] border-[#00C98B]/20",
  rejected: "bg-red-500/15 text-red-700 border-red-500/20",
};

export default function AdminReviewsPage() {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      const json = await res.json();
      if (json.ok) setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const updateReview = async (item: ReviewItem, action: string) => {
    setUpdatingId(item.id);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: item.id, action }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                reviews:
                  action === "delete"
                    ? prev.reviews.filter((r) => r.id !== item.id)
                    : prev.reviews.map((r) =>
                        r.id === item.id ? { ...r, status: action } : r
                      ),
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Total</p>
              <div className="grid size-8 place-items-center rounded-lg bg-gray-500/10 text-gray-600">
                <Star className="size-4" />
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
              <p className="text-xs font-medium text-muted-foreground">Pending</p>
              <div className="grid size-8 place-items-center rounded-lg bg-yellow-500/10 text-yellow-600">
                <MessageSquare className="size-4" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{stats?.pending ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Approved</p>
              <div className="grid size-8 place-items-center rounded-lg bg-[#00C98B]/10 text-[#00C98B]">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{stats?.approved ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Rejected</p>
              <div className="grid size-8 place-items-center rounded-lg bg-red-500/10 text-red-600">
                <XCircle className="size-4" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{stats?.rejected ?? 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={status}
              onValueChange={(v) => { setStatus(v ?? "all"); setPage(1); }}
            >
              <SelectTrigger className="h-9 w-[170px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
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

      {/* Review Cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : !data || data.reviews.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-8">
            <p className="text-xs text-muted-foreground text-center">
              No reviews match the current filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.reviews.map((r) => (
            <Card key={r.id} className="bg-white">
              <CardContent className="p-4 space-y-3">
                {/* Header row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-full bg-[#0A0A0A]/5 font-heading text-xs font-bold text-[#0A0A0A]">
                    {r.name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w.charAt(0).toUpperCase())
                      .join("") || "?"}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    {r.role && (
                      <p className="truncate text-[11px] text-muted-foreground">{r.role}</p>
                    )}
                  </div>

                  <span className="text-xs tracking-wide" title={`${r.rating}/5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < r.rating ? "text-amber-400" : "text-gray-300"}>
                        ★
                      </span>
                    ))}
                  </span>

                  <span className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>

                  <div className="ml-auto flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${statusBadge[r.status] ?? statusBadge.pending}`}
                    >
                      {r.status}
                    </Badge>

                    <Select
                      value={r.status}
                      onValueChange={(v) => updateReview(r, v ?? "pending")}
                      disabled={updatingId === r.id}
                    >
                      <SelectTrigger className="h-7 w-[120px] text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved" className="text-[11px]">Approve</SelectItem>
                        <SelectItem value="pending" className="text-[11px]">Pending</SelectItem>
                        <SelectItem value="rejected" className="text-[11px]">Reject</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                      disabled={updatingId === r.id}
                      onClick={() => updateReview(r, "delete")}
                      title="Delete review"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Message */}
                <p className="text-xs leading-relaxed whitespace-pre-wrap">
                  &ldquo;{r.message}&rdquo;
                </p>
              </CardContent>
            </Card>
          ))}
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