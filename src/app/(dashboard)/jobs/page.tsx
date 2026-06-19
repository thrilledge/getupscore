"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  ExternalLink,
  TrendingUp,
  Target,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

type Analysis = {
  match_score: number;
  opportunity_score: number;
  win_probability: number | null;
  skills_match: Record<string, boolean> | null;
  budget_fit: string | null;
  client_analysis: string | null;
  competition_analysis: string | null;
  recommendation: string | null;
  reasoning: string | null;
  proposal_tips: string[] | null;
  red_flags: string[] | null;
  model_used: string;
};

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
  client_country: string | null;
  proposals_count: number | null;
  created_at: string;
  job_analyses: Analysis[];
  job_scores: Array<{ match_score: number; opportunity_score: number }>;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<"newest" | "score">("newest");
  const [scoreMin, setScoreMin] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", sort });
      if (scoreMin > 0) params.set("score_min", String(scoreMin));

      const res = await fetch(`/api/jobs?${params}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Not logged in");
        throw new Error(`HTTP ${res.status}`);
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
  }, [page, sort, scoreMin]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  function scoreColor(score: number): string {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  }

  function scoreBg(score: number): string {
    if (score >= 80) return "bg-green-500/10 border-green-500/30";
    if (score >= 60) return "bg-yellow-500/10 border-yellow-500/30";
    return "bg-red-500/10 border-red-500/30";
  }

  function daysAgo(dateStr: string | null): string {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-1">AI-scored job opportunities from Upwork</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchJobs} disabled={loading}>
          <RefreshCw className={"size-4 mr-2" + (loading ? " animate-spin" : "")} />
          Refresh
        </Button>
      </div>

      {/* Filters & Sort Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          {(["newest", "score"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setSort(s); setPage(1); }}
              className={
                "text-sm px-3 py-1.5 rounded-md border transition-colors " +
                (sort === s
                  ? "bg-accent-blue/10 border-accent-blue/40 text-accent-blue"
                  : "border-border/60 text-muted-foreground hover:bg-muted/50")
              }
            >
              {s === "newest" ? "Newest" : "Best Match"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Min score:</span>
          {[0, 50, 70, 90].map((s) => (
            <button
              key={s}
              onClick={() => { setScoreMin(s); setPage(1); }}
              className={
                "text-sm px-2.5 py-1.5 rounded-md border transition-colors " +
                (scoreMin === s
                  ? "bg-accent-purple/10 border-accent-purple/40 text-accent-purple"
                  : "border-border/60 text-muted-foreground hover:bg-muted/50")
              }
            >
              {s === 0 ? "All" : `${s}+`}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{total} job{total !== 1 ? "s" : ""} found</span>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="py-6 text-center">
            <AlertTriangle className="size-8 mx-auto mb-2 text-red-500" />
            <p className="text-red-500 font-medium">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchJobs}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-5">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && jobs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="size-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold text-lg mb-1">No jobs found</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {scoreMin > 0
                ? `No jobs with match score >= ${scoreMin}. Try lowering the minimum score.`
                : "Jobs will appear here once the extension captures them and AI analysis completes."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Job List */}
      {!loading && !error && jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map((job) => {
            const a = job.job_analyses?.[0];
            const isExpanded = expandedId === job.id;
            return (
              <Card key={job.id} className={"transition-all duration-200 hover:shadow-sm" + (isExpanded ? " ring-1 ring-accent-blue/30" : "")}>
                <CardContent className="py-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold text-base truncate">{job.title}</h3>
                        {job.url && (
                          <a href={job.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-accent-blue transition-colors">
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {job.posted_at && <span>{daysAgo(job.posted_at)}</span>}
                        {job.client_country && <span>{job.client_country}</span>}
                        {job.budget != null && <span className="font-medium">${job.budget}</span>}
                        {job.hourly_min != null && <span className="font-medium">${job.hourly_min}–${job.hourly_max}/hr</span>}
                        {job.proposals_count != null && <span>{job.proposals_count} proposals</span>}
                      </div>
                    </div>
                    {a && (
                      <div className={"shrink-0 flex flex-col items-center rounded-lg border px-3 py-1.5 " + scoreBg(a.match_score)}>
                        <span className={"text-lg font-bold leading-tight " + scoreColor(a.match_score)}>{a.match_score}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Match</span>
                      </div>
                    )}
                  </div>

                  {/* Expand/Collapse Toggle */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : job.id)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary mt-3 transition-colors"
                  >
                    {isExpanded ? <><ChevronUp className="size-3.5" /> Show less</> : <><ChevronDown className="size-3.5" /> Show AI analysis</>}
                  </button>

                  {/* Expanded Analysis */}
                  {isExpanded && a && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {/* Score Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                            <Target className="size-4" />
                            <span className="text-[10px] uppercase tracking-wider font-semibold">Match Score</span>
                          </div>
                          <span className={"text-xl font-bold " + scoreColor(a.match_score)}>{a.match_score}</span>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                            <TrendingUp className="size-4" />
                            <span className="text-[10px] uppercase tracking-wider font-semibold">Opportunity</span>
                          </div>
                          <span className={"text-xl font-bold " + scoreColor(a.opportunity_score)}>{a.opportunity_score}</span>
                        </div>
                        {a.win_probability != null && (
                          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                              <Briefcase className="size-4" />
                              <span className="text-[10px] uppercase tracking-wider font-semibold">Win Probability</span>
                            </div>
                            <span className={"text-xl font-bold " + scoreColor(a.win_probability)}>{a.win_probability}%</span>
                          </div>
                        )}
                      </div>

                      {/* Skills Match */}
                      {a.skills_match && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Skills Match</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(a.skills_match).map(([skill, matched]) => (
                              <Badge key={skill} variant={matched ? "default" : "secondary"} className={"text-xs" + (matched ? " bg-green-500/15 text-green-600 hover:bg-green-500/20" : "")}>
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendation & Reasoning */}
                      {a.recommendation && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recommendation</h4>
                          <p className="text-sm">{a.recommendation}</p>
                        </div>
                      )}
                      {a.reasoning && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reasoning</h4>
                          <p className="text-sm text-muted-foreground">{a.reasoning}</p>
                        </div>
                      )}

                      {/* Proposal Tips */}
                      {a.proposal_tips && a.proposal_tips.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Lightbulb className="size-3.5 text-yellow-500" />
                            Proposal Tips
                          </h4>
                          <ul className="space-y-1">
                            {a.proposal_tips.map((tip, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-yellow-500 mt-0.5">&bull;</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Red Flags */}
                      {a.red_flags && a.red_flags.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <AlertTriangle className="size-3.5 text-red-500" />
                            Red Flags
                          </h4>
                          <ul className="space-y-1">
                            {a.red_flags.map((flag, i) => (
                              <li key={i} className="text-sm text-red-500/80 flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">&bull;</span>
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="text-[10px] text-muted-foreground">Analyzed via {a.model_used || "GroqCloud AI"}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <span className="text-sm text-muted-foreground px-3">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
