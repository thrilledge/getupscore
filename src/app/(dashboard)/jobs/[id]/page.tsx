"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { JobDescription } from "@/components/job-description";
import {
  Briefcase,
  ExternalLink,
  TrendingUp,
  Target,
  AlertTriangle,
  Lightbulb,
  ArrowLeft,
  Sparkles,
  Loader2,
  Clock,
  DollarSign,
  Layers,
  User,
  Star,
  Shield,
  MapPin,
  Calendar,
  Users,
  Zap,
  CheckCircle2,
  XCircle,
  Building2,
  Timer,
  FileText,
  Globe,
} from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import { JobChat } from "@/components/job-chat";
import { formatJobType } from "@/lib/format-job";

type Analysis = {
  match_score: number;
  opportunity_score: number;
  win_probability: number | null;
  skills_match: Record<string, any> | null;
  budget_fit: any;
  client_analysis: any;
  competition_analysis: any;
  recommendation: string | null;
  reasoning: string | null;
  proposal_tips: string[] | null;
  red_flags: string[] | null;
  model_used: string;
};

type PreferredQualifications = {
  english_proficiency?: string | null;
  has_portfolio?: boolean | null;
  min_hours_worked?: number | null;
  min_job_success_score?: number | null;
  rising_talent?: boolean | null;
  [key: string]: unknown;
};

type ClientWorkHistory = {
  closed?: Array<{ id?: string; title?: string; postedDate?: string; totalHours?: number; type?: string }>;
  open?: Array<{ id?: string; title?: string; postedDate?: string; totalHours?: number; type?: string }>;
  more_available?: boolean | null;
  note?: string | null;
  [key: string]: unknown;
};

type Job = {
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
  client_hire_rate: number | null;
  client_total_spend: number | null;
  client_member_since: string | null;
  client_industry: string | null;
  client_score: number | null;
  client_hours_count: number | null;
  client_feedback_count: number | null;
  client_feedback_score: number | null;
  client_contracts_active: number | null;
  client_contracts_total: number | null;
  client_timezone: string | null;
  client_state: string | null;
  client_region: string | null;
  persons_to_hire: number | null;
  engagement_type: string | null;
  client_hourly_budget_type: string | null;
  preferred_qualifications: PreferredQualifications | null;
  client_payment_verified: boolean | null;
  client_city: string | null;
  client_company_size: number | null;
  client_total_jobs_with_hires: number | null;
  client_active_assignments: number | null;
  client_location_country: string | null;
  client_recent_history: ClientWorkHistory | null;
  proposals_count: number | null;
  connects_required: number | null;
  total_invited: number | null;
  total_hired: number | null;
  payment_verified: boolean | null;
  category: string | null;
  subcategory: string | null;
  created_at: string;
  job_analyses: Analysis[];
};

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 1) return "Just now";
  const sign = minutes < 0 ? "-" : "";
  const absMins = Math.abs(minutes);
  if (absMins < 60) return `${sign}${absMins}m ago`;
  const hours = Math.floor(absMins / 60);
  if (hours < 24) return `${sign}${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${sign}${days}d ago`;
}

function formatExperience(tier: string | null): string {
  if (!tier) return "";
  const map: Record<string, string> = {
    EntryLevel: "Entry",
    IntermediateLevel: "Intermediate",
    ExpertLevel: "Expert",
  };
  return map[tier] || tier.replace(/([A-Z])/g, " $1").trim();
}

function formatBudget(job: Job): string {
  if (job.budget != null) return `$${job.budget.toLocaleString()}`;
  if (job.hourly_min != null && job.hourly_max != null)
    return `$${job.hourly_min}–${job.hourly_max}/hr`;
  if (job.hourly_min != null) return `From $${job.hourly_min}/hr`;
  if (job.hourly_max != null) return `Up to $${job.hourly_max}/hr`;
  return "—";
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-500/10 border-green-500/20";
  if (score >= 60) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function recommendationMeta(rec: string) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    strong_apply: { label: "Strong Apply", color: "bg-green-500/15 text-green-700 border-green-500/30", icon: <Zap className="size-3.5" /> },
    apply: { label: "Apply", color: "bg-blue-500/15 text-blue-700 border-blue-500/30", icon: <CheckCircle2 className="size-3.5" /> },
    consider: { label: "Consider", color: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30", icon: <Lightbulb className="size-3.5" /> },
    skip: { label: "Skip", color: "bg-orange-500/15 text-orange-700 border-orange-500/30", icon: <AlertTriangle className="size-3.5" /> },
    hide: { label: "Hide", color: "bg-red-500/15 text-red-700 border-red-500/30", icon: <XCircle className="size-3.5" /> },
  };
  return map[rec] || map.consider;
}

function clientLocation(job: Job): string {
  if (job.client_city && job.client_location_country)
    return `${job.client_city}, ${job.client_location_country}`;
  if (job.client_city) return job.client_city;
  if (job.client_location_country) return job.client_location_country;
  if (job.client_country) return job.client_country;
  if (job.client_score != null || job.client_total_spend != null) return "Location not available";
  return "New client — no history yet";
}

function ClientWorkHistorySection({ history }: { history: ClientWorkHistory }) {
  const entries = history.closed || [];
  if (entries.length === 0) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-lg bg-accent-purple/10 p-1.5">
          <Briefcase className="size-4 text-accent-purple" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Client Work History
        </span>
      </div>
      <div className="space-y-2">
        {entries.slice(0, 10).map((job, i) => (
          <div key={job.id || i} className="flex items-center justify-between gap-4 border-b border-border/40 pb-2 text-sm">
            <span className="font-medium truncate">{job.title || "Untitled"}</span>
            <span className="text-muted-foreground whitespace-nowrap shrink-0">
              {job.type ? `${job.type.replace(/_/g, " ")} · ` : ""}
              {job.totalHours != null ? `${job.totalHours.toLocaleString()} hrs` : "—"}
            </span>
          </div>
        ))}
        {history.more_available && (
          <p className="text-xs text-muted-foreground pt-1">…and more on Upwork</p>
        )}
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJob();
  }, [id]);

  async function fetchJob() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJob(data.job);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/jobs/${id}/analyze`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      await fetchJob();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  const analysis = job?.job_analyses?.[0];

  if (loading) {
    return (
      <div className="max-w-[1400] mx-auto space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1400] mx-auto">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <AlertTriangle className="size-10 mx-auto mb-3 text-red-500" />
          <p className="text-red-500 font-medium">{error}</p>
          <Button variant="outline" className="mt-3" onClick={fetchJob}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-[1400] mx-auto">
        <div className="rounded-xl border border-border/60 p-12 text-center">
          <Briefcase className="size-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">Job not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400] mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent-blue transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Jobs
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_500px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* ── Header ── */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <FavoriteButton jobId={job.id} size="lg" />
                  <h1 className="text-2xl font-bold font-heading leading-tight">
                    {job.title}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3 ml-12">
                  {job.job_type && (
                    <Badge
                      variant="secondary"
                      className="text-[11px] px-2.5 py-0.5 font-medium rounded-full"
                    >
                      {formatJobType(job.job_type)}
                    </Badge>
                  )}
                  {job.contractor_tier && (
                    <Badge
                      variant="outline"
                      className="text-[11px] px-2.5 py-0.5 font-normal rounded-full border-border/50"
                    >
                      {formatExperience(job.contractor_tier)}
                    </Badge>
                  )}
                  {job.category && (
                    <Badge
                      variant="outline"
                      className="text-[11px] px-2.5 py-0.5 font-normal rounded-full border-border/50"
                    >
                      {job.category}
                    </Badge>
                  )}
                  {job.payment_verified && (
                    <Badge className="text-[11px] px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-700 hover:bg-green-500/20 border-0">
                      <Shield className="size-3 mr-1" /> Payment Verified
                    </Badge>
                  )}
                </div>
              </div>
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-accent-blue hover:underline shrink-0"
                >
                  <ExternalLink className="size-4" />
                  Upwork
                </a>
              )}
            </div>
          </div>

          {/* ── Quick Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Budget */}
            <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-accent-green via-accent-green/80 to-accent-green/60" />
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-lg bg-accent-green/10 p-1.5">
                  <DollarSign className="size-4 text-accent-green" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Budget</span>
              </div>
              <p className="text-lg font-bold tabular-nums">
                {formatBudget(job)}
              </p>
              {job.weekly_retainer != null && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ${job.weekly_retainer}/wk retainer
                </p>
              )}
            </div>

            {/* Posted */}
            <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-accent-blue via-accent-blue/80 to-accent-blue/60" />
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-lg bg-accent-blue/10 p-1.5">
                  <Clock className="size-4 text-accent-blue" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Posted</span>
              </div>
              <p className="text-lg font-bold">{daysAgo(job.posted_at) || "—"}</p>
              {job.posted_at && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(job.posted_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Duration */}
            <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-accent-purple via-accent-purple/80 to-accent-purple/60" />
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-lg bg-accent-purple/10 p-1.5">
                  <Timer className="size-4 text-accent-purple" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Duration</span>
              </div>
              <p className="text-lg font-bold">{job.duration_label || "—"}</p>
              {job.duration_weeks != null && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {job.duration_weeks} weeks
                </p>
              )}
              {job.hours_per_week && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {job.hours_per_week}
                </p>
              )}
            </div>

          </div>

          {/* ── Client Section ── */}
          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-accent-blue via-accent-purple to-accent-blue/60" />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Client Details
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Left: Client Profile */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-accent-blue/10 p-2.5 mt-0.5">
                      <User className="size-5 text-accent-blue" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {clientLocation(job)}
                        </span>
                      </div>
                      {job.client_score != null && job.client_score > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`size-3.5 ${s <= Math.round(job.client_score!) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold">{job.client_score!.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">client score</span>
                        </div>
                      )}
                      {job.client_member_since && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Calendar className="size-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Member since {new Date(job.client_member_since).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {job.client_payment_verified && (
                      <Badge className="text-[11px] px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-700 border-0">
                        <Shield className="size-3 mr-1" /> Payment Verified
                      </Badge>
                    )}
                    {job.client_industry && (
                      <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 rounded-full border-border/50">
                        <Building2 className="size-3 mr-1" /> {job.client_industry}
                      </Badge>
                    )}
                    {job.client_company_size != null && (
                      <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 rounded-full border-border/50">
                        <Users className="size-3 mr-1" /> {job.client_company_size} employees
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Right: Client Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {job.client_total_spend != null && (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Spent</p>
                      <p className="text-base font-bold tabular-nums">${job.client_total_spend.toLocaleString()}</p>
                    </div>
                  )}
                  {job.client_hire_rate != null && (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hire Rate</p>
                      <p className="text-base font-bold tabular-nums">{job.client_hire_rate}%</p>
                    </div>
                  )}
                  {job.client_total_jobs_with_hires != null && (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Jobs Posted</p>
                      <p className="text-base font-bold tabular-nums">{job.client_total_jobs_with_hires}</p>
                    </div>
                  )}
                  {job.connects_required != null && (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Connects</p>
                      <p className="text-base font-bold tabular-nums">{job.connects_required}</p>
                    </div>
                  )}
                  {job.client_active_assignments != null && (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Active</p>
                      <p className="text-base font-bold tabular-nums">{job.client_active_assignments}</p>
                    </div>
                  )}
                  {job.client_hours_count != null && (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hours Logged</p>
                      <p className="text-base font-bold tabular-nums">{job.client_hours_count.toLocaleString()}</p>
                    </div>
                  )}
                  {job.client_feedback_count != null && (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Reviews</p>
                      <p className="text-base font-bold tabular-nums">{job.client_feedback_count}</p>
                    </div>
                  )}
                  {job.client_feedback_score != null && (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Feedback</p>
                      <p className="text-base font-bold tabular-nums">{job.client_feedback_score.toFixed(2)}</p>
                    </div>
                  )}
                  {(job.client_contracts_active != null || job.client_contracts_total != null) && (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Open / Total Contracts</p>
                      <p className="text-base font-bold tabular-nums">
                        {job.client_contracts_active ?? "—"} / {job.client_contracts_total ?? "—"}
                      </p>
                    </div>
                  )}
                  {job.persons_to_hire != null && (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hiring</p>
                      <p className="text-base font-bold tabular-nums">
                        {job.persons_to_hire} {job.persons_to_hire === 1 ? "person" : "people"}
                      </p>
                    </div>
                  )}
                  {job.engagement_type && (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Engagement</p>
                      <p className="text-sm font-bold">{job.engagement_type.replace(/_/g, " ")}</p>
                    </div>
                  )}
                  {job.client_timezone && (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Timezone</p>
                      <p className="text-sm font-bold">{job.client_timezone}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Skills ── */}
          {job.skills && job.skills.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="rounded-lg bg-accent-purple/10 p-1.5">
                  <Layers className="size-4 text-accent-purple" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Skills
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 font-normal rounded-full border-border/50 bg-muted/10"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* ── Preferred Qualifications ── */}
          {job.preferred_qualifications && Object.keys(job.preferred_qualifications).length > 0 && (
            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="rounded-lg bg-accent-blue/10 p-1.5">
                  <Target className="size-4 text-accent-blue" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Preferred Qualifications
                </span>
              </div>
              <div className="space-y-2 text-sm">
                {(job.preferred_qualifications.english_proficiency != null && job.preferred_qualifications.english_proficiency !== "" && job.preferred_qualifications.english_proficiency !== "Any") && (
                  <p className="flex justify-between gap-4 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">English</span>
                    <span className="font-medium text-right">{job.preferred_qualifications.english_proficiency}</span>
                  </p>
                )}
                {job.preferred_qualifications.min_job_success_score != null && job.preferred_qualifications.min_job_success_score > 0 && (
                  <p className="flex justify-between gap-4 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Min Job Success Score</span>
                    <span className="font-medium text-right">{job.preferred_qualifications.min_job_success_score}%</span>
                  </p>
                )}
                {job.preferred_qualifications.min_hours_worked != null && job.preferred_qualifications.min_hours_worked > 0 && (
                  <p className="flex justify-between gap-4 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Min Hours Worked</span>
                    <span className="font-medium text-right">{job.preferred_qualifications.min_hours_worked.toLocaleString()}</span>
                  </p>
                )}
                {job.preferred_qualifications.has_portfolio != null && (
                  <p className="flex justify-between gap-4 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Portfolio Required</span>
                    <span className="font-medium text-right">{job.preferred_qualifications.has_portfolio ? "Yes" : "No"}</span>
                  </p>
                )}
                {job.preferred_qualifications.rising_talent != null && (
                  <p className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Rising Talent</span>
                    <span className="font-medium text-right">{job.preferred_qualifications.rising_talent ? "Yes" : "No"}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Client Work History ── */}
          {job.client_recent_history && (
            <ClientWorkHistorySection history={job.client_recent_history} />
          )}

          {/* ── Description ── */}
          {job.description && (
            <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-accent-blue/10 p-1.5">
                    <FileText className="size-4 text-accent-blue" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </span>
                </div>
              </div>
              <div className="p-5">
                <JobDescription text={job.description} />
              </div>
            </div>
          )}

          {/* ── AI Analysis ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-accent-purple/10 p-1.5">
                  <Sparkles className="size-4 text-accent-purple" />
                </div>
                <h2 className="text-lg font-semibold font-heading">AI Analysis</h2>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing}
                size="sm"
                variant={analysis ? "outline" : "default"}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" /> Analyzing...
                  </>
                ) : analysis ? (
                  "Re-analyze"
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" /> Analyze
                  </>
                )}
              </Button>
            </div>

            {analysis ? (
              <div className="space-y-4">
                {/* Score Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className={`relative overflow-hidden rounded-xl border p-4 text-center ${scoreBg(analysis.match_score)}`}>
                    <Target className="size-5 mx-auto mb-1.5 text-muted-foreground" />
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                      Match
                    </p>
                    <p className={`text-3xl font-bold tabular-nums ${scoreColor(analysis.match_score)}`}>
                      {analysis.match_score}
                    </p>
                  </div>
                  <div className={`relative overflow-hidden rounded-xl border p-4 text-center ${scoreBg(analysis.opportunity_score)}`}>
                    <TrendingUp className="size-5 mx-auto mb-1.5 text-muted-foreground" />
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                      Opportunity
                    </p>
                    <p className={`text-3xl font-bold tabular-nums ${scoreColor(analysis.opportunity_score)}`}>
                      {analysis.opportunity_score}
                    </p>
                  </div>
                  {analysis.win_probability != null && (
                    <div className={`relative overflow-hidden rounded-xl border p-4 text-center ${scoreBg(analysis.win_probability)}`}>
                      <Briefcase className="size-5 mx-auto mb-1.5 text-muted-foreground" />
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                        Win Prob.
                      </p>
                      <p className={`text-3xl font-bold tabular-nums ${scoreColor(analysis.win_probability)}`}>
                        {analysis.win_probability}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Recommendation Badge */}
                {analysis.recommendation && (
                  <div className={`flex items-center gap-2 rounded-xl border p-3 ${recommendationMeta(analysis.recommendation).color}`}>
                    {recommendationMeta(analysis.recommendation).icon}
                    <span className="text-sm font-semibold capitalize">
                      {recommendationMeta(analysis.recommendation).label}
                    </span>
                    {analysis.reasoning && (
                      <span className="text-xs opacity-80 ml-auto line-clamp-1">
                        {analysis.reasoning}
                      </span>
                    )}
                  </div>
                )}

                {/* Skills Match */}
                {analysis.skills_match && (
                  <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Skills Match
                    </h3>
                    {analysis.skills_match.overall_fit && (
                      <Badge variant="outline" className="text-xs mb-3">
                        {analysis.skills_match.overall_fit}
                      </Badge>
                    )}
                    <div className="space-y-2.5">
                      {analysis.skills_match.matched_skills?.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                            Matched
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.skills_match.matched_skills.map(
                              (s: string, i: number) => (
                                <Badge
                                  key={`${s}-${i}`}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 border-0 font-normal"
                                >
                                  {s}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                      {analysis.skills_match.missing_skills?.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                            Missing
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.skills_match.missing_skills.map(
                              (s: string, i: number) => (
                                <Badge
                                  key={`${s}-${i}`}
                                  variant="secondary"
                                  className="text-[10px] px-2 py-0.5 rounded-full font-normal"
                                >
                                  {s}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Budget Fit + Client Analysis + Competition — side by side */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {analysis.budget_fit && (
                    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                      <DollarSign className="size-4 text-accent-green mb-2" />
                      <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                        Budget Fit
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {analysis.budget_fit.assessment || "No assessment"}
                      </p>
                    </div>
                  )}
                  {analysis.client_analysis && (
                    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                      <User className="size-4 text-accent-blue mb-2" />
                      <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                        Client Analysis
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {analysis.client_analysis.recommendation || "No recommendation"}
                      </p>
                      {analysis.client_analysis.payment_risk && (
                        <Badge
                          variant="outline"
                          className="mt-2 text-[10px] px-2 py-0.5 rounded-full capitalize"
                        >
                          {analysis.client_analysis.payment_risk} risk
                        </Badge>
                      )}
                    </div>
                  )}
                  {analysis.competition_analysis && (
                    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                      <Users className="size-4 text-accent-amber mb-2" />
                      <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                        Competition
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {analysis.competition_analysis.advice || "No advice"}
                      </p>
                      {analysis.competition_analysis.competition_level && (
                        <Badge
                          variant="outline"
                          className="mt-2 text-[10px] px-2 py-0.5 rounded-full capitalize"
                        >
                          {analysis.competition_analysis.competition_level}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Tips & Red Flags — side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.proposal_tips && analysis.proposal_tips.length > 0 && (
                    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="rounded-lg bg-yellow-500/10 p-1.5">
                          <Lightbulb className="size-3.5 text-yellow-600" />
                        </div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Proposal Tips
                        </h3>
                      </div>
                      <ul className="space-y-2">
                        {analysis.proposal_tips.map((tip, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2 leading-relaxed"
                          >
                            <span className="text-yellow-500 mt-1 shrink-0">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.red_flags && analysis.red_flags.length > 0 && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="rounded-lg bg-red-500/10 p-1.5">
                          <AlertTriangle className="size-3.5 text-red-500" />
                        </div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-red-700">
                          Red Flags
                        </h3>
                      </div>
                      <ul className="space-y-2">
                        {analysis.red_flags.map((flag, i) => (
                          <li
                            key={i}
                            className="text-sm text-red-600/80 flex items-start gap-2 leading-relaxed"
                          >
                            <span className="text-red-500 mt-1 shrink-0">•</span>
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Analyzed via {analysis.model_used || "keyword-fallback"}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-card p-12 text-center shadow-sm">
                <div className="rounded-xl bg-accent-purple/10 p-3 w-fit mx-auto mb-4">
                  <Sparkles className="size-8 text-accent-purple" />
                </div>
                <h3 className="font-semibold text-lg font-heading mb-1">No AI analysis yet</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Click the button above to analyze this job. You&apos;ll get match
                  scores, opportunity assessment, proposal tips, and more.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
          <JobChat key={job.id} jobId={job.id} jobTitle={job.title} className="h-full" />
        </div>
      </div>
    </div>
  );
}
