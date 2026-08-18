"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  ExternalLink,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  X,
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
  client_hire_rate: number | null;
  client_payment_verified: boolean | null;
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

  const [error, setError] = useState<
    string | null
  >(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] =
    useState(1);

  const [total, setTotal] = useState(0);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [jobTypeFilter, setJobTypeFilter] =
    useState("");

  const [tierFilter, setTierFilter] =
    useState("");

  const [budgetMin, setBudgetMin] =
    useState("");

  const [budgetMax, setBudgetMax] =
    useState("");

  const [hourlyMin, setHourlyMin] =
    useState("");

  const [hourlyMax, setHourlyMax] =
    useState("");

  const [skillFilter, setSkillFilter] =
    useState("");

  const [categoryFilter, setCategoryFilter] =
    useState("");

  const [
    subcategoryFilter,
    setSubcategoryFilter,
  ] = useState("");

  const [
    initialFiltersLoaded,
    setInitialFiltersLoaded,
  ] = useState(false);

  useEffect(() => {
    supabase
      .from("job_filters")
      .select("*")
      .eq("is_active", true)
      .order("created_at", {
        ascending: true,
      })
      .limit(1)
      .then(({ data: filters, error }) => {
        if (
          error ||
          !filters ||
          filters.length === 0
        ) {
          setInitialFiltersLoaded(true);
          return;
        }

        const filter = filters[0];

        if (filter.keywords?.length) {
          setSearchQuery(
            filter.keywords.join(", ")
          );
        }

        if (filter.job_type) {
          setJobTypeFilter(filter.job_type);
        }

        if (filter.contractor_tier) {
          setTierFilter(
            filter.contractor_tier
          );
        }

        if (filter.min_budget != null) {
          setBudgetMin(
            String(filter.min_budget)
          );
        }

        if (filter.max_budget != null) {
          setBudgetMax(
            String(filter.max_budget)
          );
        }

        if (filter.hourly_min != null) {
          setHourlyMin(
            String(filter.hourly_min)
          );
        }

        if (filter.hourly_max != null) {
          setHourlyMax(
            String(filter.hourly_max)
          );
        }

        if (filter.skills?.length) {
          setSkillFilter(
            filter.skills.join(", ")
          );
        }

        if (filter.category) {
          setCategoryFilter(filter.category);
        }

        if (filter.subcategory) {
          setSubcategoryFilter(
            filter.subcategory
          );
        }

        setInitialFiltersLoaded(true);
      });
  }, []);

  function buildSearchParams(
    currentPage: number
  ): string {
    const params = new URLSearchParams();

    params.set("page", String(currentPage));
    params.set("limit", "20");

    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }

    if (jobTypeFilter) {
      params.set(
        "job_type",
        jobTypeFilter
      );
    }

    if (tierFilter) {
      params.set(
        "contractor_tier",
        tierFilter
      );
    }

    if (budgetMin) {
      params.set("budget_min", budgetMin);
    }

    if (budgetMax) {
      params.set("budget_max", budgetMax);
    }

    if (hourlyMin) {
      params.set("hourly_min", hourlyMin);
    }

    if (hourlyMax) {
      params.set("hourly_max", hourlyMax);
    }

    if (skillFilter.trim()) {
      params.set(
        "skill",
        skillFilter.trim()
      );
    }

    if (categoryFilter) {
      params.set(
        "category",
        categoryFilter
      );
    }

    if (subcategoryFilter) {
      params.set(
        "subcategory",
        subcategoryFilter
      );
    }

    return params.toString();
  }

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryString =
        buildSearchParams(page);

      const response = await fetch(
        `/api/jobs?${queryString}`
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Not logged in");
        }

        let detail = `HTTP ${response.status}`;

        try {
          const body = await response.json();

          if (body?.error) {
            detail += `: ${body.error}`;
          }
        } catch { }

        throw new Error(detail);
      }

      const data = await response.json();

      setJobs(data.jobs || []);

      setTotalPages(
        data.pagination?.totalPages || 1
      );

      setTotal(
        data.pagination?.total || 0
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load jobs"
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    searchQuery,
    jobTypeFilter,
    tierFilter,
    budgetMin,
    budgetMax,
    hourlyMin,
    hourlyMax,
    skillFilter,
    categoryFilter,
    subcategoryFilter,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    jobTypeFilter,
    tierFilter,
    budgetMin,
    budgetMax,
    hourlyMin,
    hourlyMax,
    skillFilter,
    categoryFilter,
    subcategoryFilter,
  ]);

  useEffect(() => {
    if (initialFiltersLoaded) {
      fetchJobs();
    }
  }, [fetchJobs, initialFiltersLoaded]);

  useEffect(() => {
    const id = setInterval(
      () => fetchJobs(),
      30000
    );

    return () => clearInterval(id);
  }, [fetchJobs]);

  function daysAgo(
    dateString: string | null
  ): string {
    if (!dateString) return "";

    const difference =
      Date.now() -
      new Date(dateString).getTime();

    const minutes = Math.round(
      difference / 60000
    );

    if (Math.abs(minutes) < 1) {
      return "Just now";
    }

    const sign = minutes < 0 ? "-" : "";
    const absoluteMinutes =
      Math.abs(minutes);

    if (absoluteMinutes < 60) {
      return `${sign}${absoluteMinutes}m ago`;
    }

    const hours = Math.floor(
      absoluteMinutes / 60
    );

    if (hours < 24) {
      return `${sign}${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days === 1) {
      return minutes > 0
        ? "Yesterday"
        : "in 1 day";
    }

    return `${sign}${days}d ago`;
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
    const headers = [
      "Title",
      "Job Type",
      "Experience",
      "Budget",
      "Workload",
      "Duration",
      "Skills",
      "Client Country",
      "Client Rating",
      "Proposals",
      "Payment Verified",
      "Posted",
      "URL",
    ];

    const rows = jobs.map((job) => [
      `"${(job.title || "").replace(
        /"/g,
        '""'
      )}"`,

      job.job_type || "",
      job.contractor_tier || "",

      job.budget
        ? `$${job.budget}`
        : job.hourly_min
          ? `$${job.hourly_min}-${job.hourly_max}/hr`
          : "",

      job.hours_per_week || "",
      job.duration_label || "",

      `"${(job.skills || []).join(
        ", "
      )}"`,

      `"${job.client_country || ""}"`,

      job.client_rating?.toString() || "",
      job.proposals_count?.toString() || "",

      job.payment_verified ? "Yes" : "No",

      job.posted_at
        ? new Date(
          job.posted_at
        ).toLocaleDateString()
        : "",

      job.url || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const link =
      document.createElement("a");

    link.href =
      URL.createObjectURL(blob);

    link.download = `upwork-jobs-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    link.click();
    URL.revokeObjectURL(link.href);
  }

  const hasActiveFilters =
    searchQuery ||
    jobTypeFilter ||
    tierFilter ||
    budgetMin ||
    budgetMax ||
    hourlyMin ||
    hourlyMax ||
    skillFilter ||
    categoryFilter ||
    subcategoryFilter;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-4 overflow-x-clip pb-6 sm:space-y-5 sm:pb-8 xl:space-y-6">
      {/* Header */}
      <section className="animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 text-white shadow-[0_16px_40px_rgba(0,0,0,0.13)] duration-500 min-[480px]:p-5 sm:rounded-[22px] md:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden opacity-35 sm:block"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.07) 1px, transparent 1px)",

            backgroundSize: "44px 44px",

            maskImage:
              "linear-gradient(to right, transparent, black)",

            WebkitMaskImage:
              "linear-gradient(to right, transparent, black)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[#00C98B]/15 blur-[100px]"
        />

        <div className="relative z-10 flex min-w-0 flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3 min-[480px]:gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B] min-[480px]:size-11 min-[480px]:rounded-2xl">
              <Briefcase className="size-4 min-[480px]:size-5" />
            </span>

            <div className="min-w-0">
              <h1 className="font-heading text-xl font-bold tracking-tight min-[480px]:text-2xl sm:text-3xl">
                Jobs
              </h1>

              <p className="mt-1 text-xs text-white/50 min-[480px]:text-sm">
                {hasActiveFilters
                  ? "Filtered"
                  : "Latest"}{" "}
                jobs from Upwork
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 md:w-auto">
            <span className="inline-flex h-9 min-w-0 items-center justify-center truncate rounded-xl border border-[#00C98B]/25 bg-[#00C98B]/10 px-3 text-[10px] font-semibold text-[#00C98B] min-[400px]:text-xs">
              {total} job
              {total !== 1 ? "s" : ""}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadCSV}
              disabled={jobs.length === 0}
              className="h-9 shrink-0 rounded-xl border-white/15 bg-white/5 px-2.5 text-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/10 hover:text-[#00C98B] min-[420px]:px-3"
            >
              <Download className="size-3.5 min-[420px]:size-4" />

              <span className="hidden min-[380px]:inline">
                CSV
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchJobs}
              disabled={loading}
              className="h-9 shrink-0 rounded-xl border-[#00C98B]/35 bg-[#00C98B]/10 px-2.5 text-[#00C98B] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B] hover:bg-[#00C98B] hover:text-[#0A0A0A] min-[420px]:px-3"
            >
              <RefreshCw
                className={`size-3.5 min-[420px]:size-4 ${loading
                    ? "animate-spin"
                    : ""
                  }`}
              />

              <span className="hidden min-[480px]:inline">
                Refresh
              </span>
            </Button>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="min-w-0 rounded-2xl border border-[#0A0A0A]/10 bg-white p-4 shadow-[0_7px_24px_rgba(0,0,0,0.035)] sm:rounded-[20px] sm:p-5">
        <div className="mb-4 flex min-w-0 items-center gap-2">
          <Search className="size-3.5 shrink-0 text-[#00A975] sm:size-4" />

          <h2 className="shrink-0 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A]/55 sm:text-xs sm:tracking-[0.14em]">
            Search and filter
          </h2>

          {hasActiveFilters && (
            <span className="hidden shrink-0 rounded-full border border-[#00C98B]/20 bg-[#00C98B]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#00A975] min-[480px]:inline-flex">
              Filters active
            </span>
          )}

          <span className="h-px min-w-0 flex-1 bg-[#0A0A0A]/10" />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 min-[560px]:grid-cols-2 md:grid-cols-4 xl:grid-cols-12">
          {/* Search */}
          <div className="min-w-0 min-[560px]:col-span-2 md:col-span-2 xl:col-span-4">
            <label className="mb-1.5 block text-[10px] font-semibold text-[#0A0A0A]/50 sm:text-[11px]">
              Search
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#0A0A0A]/35 sm:size-4" />

              <Input
                placeholder="Title or keyword..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                className="h-10 min-w-0 rounded-xl border-[#0A0A0A]/10 bg-[#F8F9F9] pl-9 pr-9 text-xs text-[#0A0A0A] placeholder:text-[#0A0A0A]/30 focus-visible:border-[#00C98B] focus-visible:ring-[#00C98B]/20 sm:text-sm"
              />

              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-lg text-[#0A0A0A]/35 transition-colors hover:bg-[#00C98B]/10 hover:text-[#00A975]"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Job Type */}
          <div className="min-w-0 md:col-span-1 xl:col-span-2">
            <label className="mb-1.5 block text-[10px] font-semibold text-[#0A0A0A]/50 sm:text-[11px]">
              Job type
            </label>

            <Select
              value={jobTypeFilter || null}
              onValueChange={(value) =>
                setJobTypeFilter(value ?? "")
              }
            >
              <SelectTrigger className="h-10 w-full min-w-0 rounded-xl border-[#0A0A0A]/10 bg-[#F8F9F9] text-xs text-[#0A0A0A] focus:border-[#00C98B] focus:ring-[#00C98B]/20 sm:text-sm">
                <SelectValue placeholder="All types" />
              </SelectTrigger>

              <SelectContent className="rounded-xl border-[#0A0A0A]/10 bg-white">
                <SelectItem
                  value=""
                  className="rounded-lg focus:bg-[#00C98B]/10 focus:text-[#00A975]"
                >
                  All types
                </SelectItem>

                <SelectItem
                  value="HOURLY"
                  className="rounded-lg focus:bg-[#00C98B]/10 focus:text-[#00A975]"
                >
                  Hourly
                </SelectItem>

                <SelectItem
                  value="FIXED_PRICE"
                  className="rounded-lg focus:bg-[#00C98B]/10 focus:text-[#00A975]"
                >
                  Fixed Price
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Minimum Budget */}
          <div className="min-w-0 md:col-span-1 xl:col-span-1">
            <label className="mb-1.5 block text-[10px] font-semibold text-[#0A0A0A]/50 sm:text-[11px]">
              Budget min
            </label>

            <Input
              type="number"
              placeholder="$0"
              value={budgetMin}
              onChange={(event) =>
                setBudgetMin(
                  event.target.value
                )
              }
              className="h-10 min-w-0 rounded-xl border-[#0A0A0A]/10 bg-[#F8F9F9] text-xs text-[#0A0A0A] placeholder:text-[#0A0A0A]/30 focus-visible:border-[#00C98B] focus-visible:ring-[#00C98B]/20 sm:text-sm"
            />
          </div>

          {/* Maximum Budget */}
          <div className="min-w-0 md:col-span-1 xl:col-span-1">
            <label className="mb-1.5 block text-[10px] font-semibold text-[#0A0A0A]/50 sm:text-[11px]">
              Budget max
            </label>

            <Input
              type="number"
              placeholder="$9999"
              value={budgetMax}
              onChange={(event) =>
                setBudgetMax(
                  event.target.value
                )
              }
              className="h-10 min-w-0 rounded-xl border-[#0A0A0A]/10 bg-[#F8F9F9] text-xs text-[#0A0A0A] placeholder:text-[#0A0A0A]/30 focus-visible:border-[#00C98B] focus-visible:ring-[#00C98B]/20 sm:text-sm"
            />
          </div>

          {/* Skill */}
          <div className="min-w-0 min-[560px]:col-span-2 md:col-span-2 xl:col-span-3">
            <label className="mb-1.5 block text-[10px] font-semibold text-[#0A0A0A]/50 sm:text-[11px]">
              Skill
            </label>

            <Autocomplete
              placeholder="e.g. React"
              value={skillFilter}
              onChange={setSkillFilter}
              type="skills"
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="min-w-0 min-[560px]:col-span-2 md:col-span-1 xl:col-span-1">
              <label
                aria-hidden="true"
                className="mb-1.5 hidden text-[11px] sm:block"
              >
                &nbsp;
              </label>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-10 w-full rounded-xl px-3 text-[10px] font-semibold text-[#0A0A0A]/45 transition-all hover:bg-[#00C98B]/10 hover:text-[#00A975] sm:text-xs"
              >
                <X className="size-3.5 shrink-0" />

                <span className="truncate">
                  Clear
                </span>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Error State */}
      {error && (
        <Card className="min-w-0 gap-0 overflow-hidden rounded-2xl border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_8px_28px_rgba(0,0,0,0.045)] sm:rounded-[20px]">
          <div className="h-[3px] bg-[#0A0A0A]" />

          <CardHeader className="px-4 pb-3 pt-4 min-[480px]:px-5 min-[480px]:pt-5">
            <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#00C98B]/10 text-[#00A975] min-[480px]:size-11 min-[480px]:rounded-2xl">
                <AlertTriangle className="size-5" />
              </span>

              <div className="min-w-0">
                <CardTitle className="font-heading text-sm font-bold text-[#0A0A0A] min-[480px]:text-base">
                  Failed to load jobs
                </CardTitle>

                <CardDescription className="mt-1 break-words text-xs leading-relaxed text-[#0A0A0A]/50 min-[480px]:text-sm">
                  {error}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-4 pb-4 pt-0 min-[480px]:px-5 min-[480px]:pb-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchJobs}
              className="h-9 w-full rounded-xl border-[#0A0A0A]/10 bg-white px-4 text-xs font-semibold text-[#0A0A0A] transition-all hover:border-[#00C98B]/40 hover:bg-[#00C98B]/5 hover:text-[#00A975] min-[420px]:w-auto"
            >
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && !error && (
        <>
          {/* Mobile and Tablet Loading */}
          <div className="grid grid-cols-1 gap-3 min-[700px]:grid-cols-2 lg:hidden">
            {[1, 2, 3, 4].map((item) => (
              <Card
                key={item}
                className="gap-0 rounded-2xl border border-[#0A0A0A]/10 bg-white py-0"
              >
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-[85%] bg-[#0A0A0A]/10" />
                      <Skeleton className="h-4 w-[60%] bg-[#0A0A0A]/5" />
                    </div>

                    <Skeleton className="size-8 rounded-xl bg-[#00C98B]/10" />
                  </div>

                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full bg-[#00C98B]/10" />
                    <Skeleton className="h-5 w-20 rounded-full bg-[#00C98B]/10" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-[#0A0A0A]/5 pt-3">
                    <Skeleton className="h-8 rounded-lg bg-[#0A0A0A]/5" />
                    <Skeleton className="h-8 rounded-lg bg-[#0A0A0A]/5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Loading Table */}
          <div className="hidden overflow-hidden rounded-[20px] border border-[#0A0A0A]/10 bg-white shadow-[0_7px_24px_rgba(0,0,0,0.035)] lg:block">
            <div className="grid grid-cols-[minmax(200px,1fr)_80px_160px_160px_100px_40px] gap-4 bg-[#0A0A0A] px-5 py-3">
              {[1, 2, 3, 4, 5, 6].map(
                (item) => (
                  <Skeleton
                    key={item}
                    className="h-3 bg-white/10"
                  />
                )
              )}
            </div>

            <div className="divide-y divide-[#0A0A0A]/10">
              {[1, 2, 3, 4, 5, 6].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <Skeleton className="h-4 w-[28%] bg-[#0A0A0A]/10" />
                    <Skeleton className="h-7 w-16 rounded-full bg-[#00C98B]/10" />
                    <Skeleton className="h-4 w-32 bg-[#0A0A0A]/10" />
                    <Skeleton className="h-4 w-24 bg-[#0A0A0A]/10" />
                    <Skeleton className="ml-auto h-4 w-16 bg-[#0A0A0A]/10" />
                    <Skeleton className="size-8 rounded-xl bg-[#00C98B]/10" />
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading &&
        !error &&
        jobs.length === 0 && (
          <Card className="relative min-w-0 gap-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] py-0 text-white shadow-[0_16px_45px_rgba(0,0,0,0.13)] sm:rounded-[22px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00C98B]/15 blur-[100px] sm:size-64"
            />

            <CardContent className="relative z-10 flex flex-col items-center px-4 py-9 text-center min-[480px]:px-5 min-[480px]:py-12">
              <span className="grid size-12 place-items-center rounded-2xl border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B] min-[480px]:size-14 min-[480px]:rounded-[18px]">
                <Briefcase className="size-5 min-[480px]:size-6" />
              </span>

              <h2 className="mt-4 font-heading text-lg font-bold text-white min-[480px]:text-xl">
                No jobs found
              </h2>

              <p className="mt-2 max-w-lg text-xs leading-5 text-white/50 min-[480px]:text-sm min-[480px]:leading-6">
                {hasActiveFilters
                  ? "No jobs match your filters. Try different keywords."
                  : "No jobs yet. The system fetches jobs every 5 minutes — check back soon."}
              </p>

              {hasActiveFilters && (
                <Button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 h-10 w-full rounded-xl bg-[#00C98B] px-5 text-xs font-bold text-[#0A0A0A] transition-all hover:-translate-y-0.5 hover:bg-[#00C98B]/90 min-[420px]:w-auto min-[420px]:rounded-full sm:text-sm"
                >
                  <X className="size-4" />
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}

      {/* Jobs */}
      {!loading &&
        !error &&
        jobs.length > 0 && (
          <>
            {/* Mobile and Tablet Cards */}
            <div className="grid min-w-0 grid-cols-1 gap-3 min-[700px]:grid-cols-2 lg:hidden">
              {jobs.map((job) => {
                const analysis =
                  job.job_analyses?.[0];

                return (
                  <Card
                    key={job.id}
                    className="group min-w-0 gap-0 overflow-hidden rounded-2xl border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_6px_22px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/35 hover:shadow-[0_12px_28px_rgba(0,201,139,0.08)]"
                  >
                    <div className="h-[2px] bg-[#00C98B]" />

                    <CardContent className="p-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start gap-2">
                            <Link
                              href={`/jobs/${job.id}`}
                              className="line-clamp-2 min-w-0 flex-1 font-heading text-sm font-bold leading-5 text-[#0A0A0A] transition-colors hover:text-[#00A975]"
                            >
                              {job.title}
                            </Link>

                            {job.url && (
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Open job on Upwork"
                                className="mt-0.5 shrink-0 text-[#0A0A0A]/30 transition-colors hover:text-[#00A975]"
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className="rounded-full bg-[#00C98B]/10 px-2 py-0.5 text-[9px] font-semibold text-[#008F64]"
                            >
                              <Briefcase className="mr-1 size-2.5" />

                              {job.job_type === "HOURLY"
                                ? "Hourly"
                                : job.job_type === "FIXED"
                                  ? "Fixed"
                                  : "—"}
                            </Badge>

                            <span className="inline-flex items-center gap-1 text-[10px] text-[#0A0A0A]/40">
                              <Clock className="size-3" />
                              {daysAgo(job.posted_at)}
                            </span>
                          </div>
                        </div>

                        <FavoriteButton
                          jobId={job.id}
                          size="md"
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#0A0A0A]/5 bg-[#F8F9F9] p-3">
                        <div className="min-w-0 border-r border-[#0A0A0A]/10 pr-2">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#0A0A0A]/35">
                            Budget
                          </p>

                          <p className="mt-1 truncate text-xs font-bold tabular-nums text-[#0A0A0A]">
                            {job.budget != null
                              ? `$${job.budget}`
                              : job.hourly_min != null
                                ? `$${job.hourly_min}–${job.hourly_max}/hr`
                                : "—"}
                          </p>
                        </div>

                        <div className="min-w-0 pl-1">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#0A0A0A]/35">
                            Workload
                          </p>

                          <p className="mt-1 truncate text-xs font-medium text-[#0A0A0A]/60">
                            {job.hours_per_week ||
                              job.duration_label ||
                              "Not specified"}
                          </p>
                        </div>
                      </div>

                      {job.skills &&
                        job.skills.length > 0 && (
                          <div className="mt-3 flex min-w-0 flex-wrap gap-1">
                            {job.skills
                              .slice(0, 3)
                              .map((skill) => (
                                <Badge
                                  key={skill}
                                  variant="outline"
                                  className="max-w-full truncate rounded-full border-[#00C98B]/20 bg-[#00C98B]/5 px-2 py-0.5 text-[9px] font-medium text-[#008F64]"
                                >
                                  {skill}
                                </Badge>
                              ))}

                            {job.skills.length > 3 && (
                              <span className="self-center text-[9px] text-[#0A0A0A]/40">
                                +
                                {job.skills.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#0A0A0A]/5 pt-3">
                        <span className="text-[10px] text-[#0A0A0A]/40">
                          {job.client_country ||
                            "Worldwide"}
                        </span>

                        <Link
                          href={`/jobs/${job.id}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0A0A0A] px-3 text-[10px] font-semibold text-white transition-colors hover:bg-[#00C98B] hover:text-[#0A0A0A]"
                        >
                          {analysis ? (
                            "View analysis"
                          ) : (
                            <>
                              <Sparkles className="size-3" />
                              Analyze
                            </>
                          )}

                          <ChevronRight className="size-3" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-[20px] border border-[#0A0A0A]/10 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.045)] lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#0A0A0A]">
                      <th className="w-[28%] px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">
                        Job
                      </th>

                      <th className="w-[10%] px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">
                        Type
                      </th>

                      <th className="w-[20%] px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">
                        Budget & Workload
                      </th>

                      <th className="w-[20%] px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">
                        Client
                      </th>

                      <th className="w-[12%] px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">
                        Posted
                      </th>

                      <th className="w-[5%] px-5 py-3.5" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#0A0A0A]/10">
                    {jobs.map((job) => {
                      const analysis =
                        job.job_analyses?.[0];

                      return (
                        <tr
                          key={job.id}
                          className="group transition-all duration-200 hover:bg-[#00C98B]/5"
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                  <Link
                                    href={`/jobs/${job.id}`}
                                    className="line-clamp-1 min-w-0 font-heading font-semibold text-[#0A0A0A] transition-colors hover:text-[#00A975]"
                                  >
                                    {job.title}
                                  </Link>

                                  {job.url && (
                                    <a
                                      href={job.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label="Open job on Upwork"
                                      className="shrink-0 text-[#0A0A0A]/30 transition-colors hover:text-[#00A975]"
                                    >
                                      <ExternalLink className="size-3.5" />
                                    </a>
                                  )}
                                </div>

                                {job.skills &&
                                  job.skills.length >
                                  0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {job.skills
                                        .slice(0, 4)
                                        .map(
                                          (skill) => (
                                            <Badge
                                              key={
                                                skill
                                              }
                                              variant="outline"
                                              className="rounded-full border-[#00C98B]/20 bg-[#00C98B]/5 px-2 py-0.5 text-[10px] font-medium text-[#008F64]"
                                            >
                                              {skill}
                                            </Badge>
                                          )
                                        )}

                                      {job.skills.length >
                                        4 && (
                                          <span className="ml-0.5 self-center text-[10px] text-[#0A0A0A]/40">
                                            +
                                            {job.skills
                                              .length -
                                              4}
                                          </span>
                                        )}
                                    </div>
                                  )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="size-3.5 shrink-0 text-[#00A975]" />

                              <Badge
                                variant="secondary"
                                className="rounded-full bg-[#00C98B]/10 px-2 py-0.5 text-[10px] font-semibold text-[#008F64]"
                              >
                                {job.job_type ===
                                  "HOURLY"
                                  ? "Hourly"
                                  : job.job_type ===
                                    "FIXED"
                                    ? "Fixed"
                                    : "—"}
                              </Badge>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="size-3.5 shrink-0 text-[#00A975]" />

                                <span className="text-sm font-bold tabular-nums text-[#0A0A0A]">
                                  {job.budget != null
                                    ? `$${job.budget}`
                                    : job.hourly_min !=
                                      null
                                      ? `$${job.hourly_min}–${job.hourly_max}/hr`
                                      : "—"}
                                </span>
                              </div>

                              {job.hours_per_week && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="size-3 shrink-0 text-[#0A0A0A]/35" />

                                  <span className="text-xs text-[#0A0A0A]/45">
                                    {
                                      job.hours_per_week
                                    }

                                    {job.duration_label
                                      ? ` · ${job.duration_label}`
                                      : ""}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              {job.client_country && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="size-3 shrink-0 text-[#0A0A0A]/35" />
                                  <span className="text-xs text-[#0A0A0A]/60">{job.client_country}</span>
                                </div>
                              )}
                              {job.client_total_spend != null && (
                                <div className="flex items-center gap-1.5">
                                  <DollarSign className="size-3 shrink-0 text-[#0A0A0A]/35" />
                                  <span className="text-xs font-medium tabular-nums text-[#0A0A0A]/70">${job.client_total_spend.toLocaleString()}</span>
                                </div>
                              )}
                              {job.client_hire_rate != null && (
                                <div className="flex items-center gap-1.5">
                                  <TrendingUp className="size-3 shrink-0 text-[#0A0A0A]/35" />
                                  <span className="text-xs text-[#0A0A0A]/50">{job.client_hire_rate}% hire</span>
                                </div>
                              )}
                              {job.client_payment_verified && (
                                <div className="flex items-center gap-1.5">
                                  <Shield className="size-3 shrink-0 text-[#008F64]" />
                                  <span className="text-xs text-[#008F64]">Verified</span>
                                </div>
                              )}
                              {!job.client_country && job.client_total_spend == null && job.client_hire_rate == null && (
                                <span className="text-xs text-[#0A0A0A]/40">—</span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span className="whitespace-nowrap text-xs text-[#0A0A0A]/45">
                              {daysAgo(
                                job.posted_at
                              )}
                            </span>

                            <div className="mt-1">
                              {analysis ? (
                                <Link
                                  href={`/jobs/${job.id}`}
                                  className="text-[11px] font-semibold text-[#00A975] transition-colors hover:text-[#00C98B] hover:underline"
                                >
                                  View analysis
                                </Link>
                              ) : (
                                <Link
                                  href={`/jobs/${job.id}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00A975] transition-colors hover:text-[#00C98B] hover:underline"
                                >
                                  <Sparkles className="size-3" />
                                  Analyze
                                </Link>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <FavoriteButton
                              jobId={job.id}
                              size="md"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mx-auto grid w-full max-w-md grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((currentPage) =>
                      Math.max(
                        1,
                        currentPage - 1
                      )
                    )
                  }
                  className="h-9 min-w-0 rounded-xl border-[#0A0A0A]/10 bg-white px-2 text-[10px] font-semibold text-[#0A0A0A] transition-all hover:border-[#00C98B]/40 hover:bg-[#00C98B]/5 hover:text-[#00A975] min-[400px]:px-4 min-[400px]:text-xs"
                >
                  <ChevronLeft className="size-3.5 shrink-0" />

                  <span className="hidden min-[360px]:inline">
                    Previous
                  </span>
                </Button>

                <span className="whitespace-nowrap rounded-full border border-[#0A0A0A]/10 bg-white px-3 py-2 text-[9px] font-medium tabular-nums text-[#0A0A0A]/45 min-[400px]:px-4 min-[400px]:text-xs">
                  <span className="hidden min-[400px]:inline">
                    Page{" "}
                  </span>

                  <span className="font-bold text-[#0A0A0A]">
                    {page}
                  </span>

                  {" / "}
                  {totalPages}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage(
                      (currentPage) =>
                        currentPage + 1
                    )
                  }
                  className="h-9 min-w-0 rounded-xl border-[#0A0A0A]/10 bg-white px-2 text-[10px] font-semibold text-[#0A0A0A] transition-all hover:border-[#00C98B]/40 hover:bg-[#00C98B]/5 hover:text-[#00A975] min-[400px]:px-4 min-[400px]:text-xs"
                >
                  <span className="hidden min-[360px]:inline">
                    Next
                  </span>

                  <ChevronRight className="size-3.5 shrink-0" />
                </Button>
              </div>
            )}
          </>
        )}
    </div>
  );
}