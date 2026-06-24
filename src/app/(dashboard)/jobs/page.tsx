"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { FavoriteButton } from "@/components/favorite-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Download,
  Clock,
  DollarSign,
  Briefcase,
} from "lucide-react";

type JobItem = {
  id: string;
  upwork_job_id: string;
  title: string;
  description: string | null;
  url: string | null;
  posted_at: string | null;
  budget: number | null;
  hourly_min: number | null;
  hourly_max: number | null;
  job_type: string | null;
  contractor_tier: string | null;
  duration_label: string | null;
  duration_weeks: number | null;
  weekly_retainer: number | null;
  hours_per_week: string | null;
  skills: string[] | null;
  client_country: string | null;
  client_name: string | null;
  client_rating: number | null;
  client_total_assignments: number | null;
  client_total_hires: number | null;
  client_total_spend: number | null;
  client_member_since: string | null;
  client_industry: string | null;
  proposals_count: number | null;
  total_invited: number | null;
  total_hired: number | null;
  payment_verified: boolean | null;
  category: string | null;
  created_at: string;
  job_analyses: Array<{
    match_score: number;
    opportunity_score: number;
    model_used: string;
  }>;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [hourlyMin, setHourlyMin] = useState("");
  const [hourlyMax, setHourlyMax] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [initialFiltersLoaded, setInitialFiltersLoaded] = useState(false);

  // Load active saved filters on mount and apply them as defaults
  useEffect(() => {
    supabase
      .from("job_filters")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .then(({ data: filters, error }) => {
        if (error || !filters || filters.length === 0) {
          setInitialFiltersLoaded(true);
          return;
        }
        const f = filters[0];
        if (f.keywords?.length) setSearchQuery(f.keywords.join(", "));
        if (f.job_type) setJobTypeFilter(f.job_type);
        if (f.contractor_tier) setTierFilter(f.contractor_tier);
        if (f.min_budget != null) setBudgetMin(String(f.min_budget));
        if (f.max_budget != null) setBudgetMax(String(f.max_budget));
        if (f.hourly_min != null) setHourlyMin(String(f.hourly_min));
        if (f.hourly_max != null) setHourlyMax(String(f.hourly_max));
        if (f.skills?.length) setSkillFilter(f.skills.join(", "));
        if (f.category) setCategoryFilter(f.category);
        if (f.subcategory) setSubcategoryFilter(f.subcategory);
        setInitialFiltersLoaded(true);
      });
  }, []);

  function buildSearchParams(p: number): string {
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", "20");
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (jobTypeFilter) params.set("job_type", jobTypeFilter);
    if (tierFilter) params.set("contractor_tier", tierFilter);
    if (budgetMin) params.set("budget_min", budgetMin);
    if (budgetMax) params.set("budget_max", budgetMax);
    if (hourlyMin) params.set("hourly_min", hourlyMin);
    if (hourlyMax) params.set("hourly_max", hourlyMax);
    if (skillFilter.trim()) params.set("skill", skillFilter.trim());
    if (categoryFilter) params.set("category", categoryFilter);
    if (subcategoryFilter) params.set("subcategory", subcategoryFilter);
    return params.toString();
  }

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildSearchParams(page);
      const res = await fetch(`/api/jobs?${qs}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Not logged in");
        let detail = `HTTP ${res.status}`;
        try { const body = await res.json(); if (body?.error) detail += `: ${body.error}`; } catch {}
        throw new Error(detail);
      }
      const data = await res.json();
      setJobs(data.jobs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, jobTypeFilter, tierFilter, budgetMin, budgetMax, hourlyMin, hourlyMax, skillFilter, categoryFilter, subcategoryFilter]);

  useEffect(() => { setPage(1); }, [searchQuery, jobTypeFilter, tierFilter, budgetMin, budgetMax, hourlyMin, hourlyMax, skillFilter, categoryFilter, subcategoryFilter]);

  useEffect(() => { if (initialFiltersLoaded) fetchJobs(); }, [fetchJobs, initialFiltersLoaded]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(() => fetchJobs(), 30000);
    return () => clearInterval(id);
  }, [fetchJobs]);

  function daysAgo(dateStr: string | null): string {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  }

  function clearFilters() {
    setSearchQuery("");
    setJobTypeFilter("");
    setTierFilter("");
    setBudgetMin("");
    setBudgetMax("");
    setHourlyMin("");
    setHourlyMax("");
    setSkillFilter("");
    setCategoryFilter("");
    setSubcategoryFilter("");
  }

  function downloadCSV() {
    const headers = ["Title", "Job Type", "Experience", "Budget", "Workload", "Duration", "Skills", "Client Country", "Client Rating", "Proposals", "Payment Verified", "Posted", "URL"];
    const rows = jobs.map((j) => [
      `"${(j.title || "").replace(/"/g, '""')}"`,
      j.job_type || "",
      j.contractor_tier || "",
      j.budget ? `$${j.budget}` : j.hourly_min ? `$${j.hourly_min}-${j.hourly_max}/hr` : "",
      j.hours_per_week || "",
      j.duration_label || "",
      `"${(j.skills || []).join(", ")}"`,
      `"${j.client_country || ""}"`,
      j.client_rating?.toString() || "",
      j.proposals_count?.toString() || "",
      j.payment_verified ? "Yes" : "No",
      j.posted_at ? new Date(j.posted_at).toLocaleDateString() : "",
      j.url || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `upwork-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const hasActiveFilters = searchQuery || jobTypeFilter || tierFilter || budgetMin || budgetMax || hourlyMin || hourlyMax || skillFilter || categoryFilter || subcategoryFilter;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-1">
            {hasActiveFilters ? "Filtered" : "Latest"} jobs from Upwork
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{total} job{total !== 1 ? "s" : ""}</span>
          <Button variant="outline" size="sm" onClick={downloadCSV} disabled={jobs.length === 0}>
            <Download className="size-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchJobs} disabled={loading}>
            <RefreshCw className={"size-4 mr-2" + (loading ? " animate-spin" : "")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Title or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
        <div className="w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Job Type</label>
          <Select value={jobTypeFilter || null} onValueChange={(v) => setJobTypeFilter(v ?? "")}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              <SelectItem value="HOURLY">Hourly</SelectItem>
              <SelectItem value="FIXED_PRICE">Fixed Price</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[130px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Budget Min</label>
          <Input
            type="number"
            placeholder="$0"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="w-[130px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Budget Max</label>
          <Input
            type="number"
            placeholder="$9999"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Skill</label>
          <Autocomplete
            placeholder="e.g. React"
            value={skillFilter}
            onChange={setSkillFilter}
            type="skills"
          />
        </div>
        {hasActiveFilters && (
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs">
              <X className="size-3 mr-1" /> Clear filters
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertTriangle className="size-6 mx-auto mb-2 text-red-500" />
          <p className="text-red-500 font-medium text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchJobs}>Retry</Button>
        </div>
      )}

      {loading && !error && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="rounded-lg border border-border/60 p-12 text-center">
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? "No jobs match your filters. Try different keywords."
              : "No jobs yet. The system fetches jobs every 5 minutes — check back soon."}
          </p>
        </div>
      )}

      {!loading && !error && jobs.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40">
                  <th className="text-left font-semibold text-muted-foreground px-5 py-3.5 w-[38%]">Job</th>
                  <th className="text-left font-semibold text-muted-foreground px-5 py-3.5 w-[13%]">Type</th>
                  <th className="text-left font-semibold text-muted-foreground px-5 py-3.5 w-[28%]">Budget & Workload</th>
                  <th className="text-right font-semibold text-muted-foreground px-5 py-3.5 w-[13%]">Posted</th>
                  <th className="w-[8%] px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {jobs.map((job) => {
                  const a = job.job_analyses?.[0];
                  return (
                    <tr
                      key={job.id}
                      className="group hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/jobs/${job.id}`}
                                className="font-semibold text-foreground hover:text-accent-blue transition-colors line-clamp-1"
                              >
                                {job.title}
                              </Link>
                              {job.url && (
                                <a
                                  href={job.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-muted-foreground/50 hover:text-accent-blue transition-colors"
                                >
                                  <ExternalLink className="size-3.5" />
                                </a>
                              )}
                            </div>
                            {job.skills && job.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {job.skills.slice(0, 4).map((s) => (
                                  <Badge
                                    key={s}
                                    variant="outline"
                                    className="text-[10px] px-2 py-0.5 font-normal rounded-full border-border/50 bg-muted/10"
                                  >
                                    {s}
                                  </Badge>
                                ))}
                                {job.skills.length > 4 && (
                                  <span className="text-[10px] text-muted-foreground self-center ml-0.5">
                                    +{job.skills.length - 4}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="size-3 text-muted-foreground/60" />
                          <Badge
                            variant="secondary"
                            className="text-[11px] px-2 py-0.5 font-medium rounded-full"
                          >
                            {job.job_type === "HOURLY" ? "Hourly" : job.job_type === "FIXED" ? "Fixed" : "—"}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="size-3.5 text-muted-foreground/60 shrink-0" />
                            <span className="font-semibold tabular-nums text-sm">
                              {job.budget != null
                                ? `$${job.budget}`
                                : job.hourly_min != null
                                  ? `$${job.hourly_min}–${job.hourly_max}/hr`
                                  : "—"}
                            </span>
                          </div>
                          {job.hours_per_week && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="size-3 text-muted-foreground/60 shrink-0" />
                              <span className="text-xs text-muted-foreground">
                                {job.hours_per_week}
                                {job.duration_label ? ` · ${job.duration_label}` : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {daysAgo(job.posted_at)}
                        </span>
                        <div className="mt-1">
                          {a ? (
                            <Link
                              href={`/jobs/${job.id}`}
                              className="text-[11px] font-medium text-accent-blue hover:underline"
                            >
                              View analysis
                            </Link>
                          ) : (
                            <Link
                              href={`/jobs/${job.id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-blue hover:underline"
                            >
                              <Sparkles className="size-3" /> Analyze
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <FavoriteButton jobId={job.id} size="md" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="size-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
