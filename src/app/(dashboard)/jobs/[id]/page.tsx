"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  Heart,
} from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";

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
  client_total_spend: number | null;
  client_member_since: string | null;
  client_industry: string | null;
  proposals_count: number | null;
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
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatExperience(tier: string | null): string {
  if (!tier) return "—";
  const map: Record<string, string> = {
    EntryLevel: "Entry",
    IntermediateLevel: "Intermediate",
    ExpertLevel: "Expert",
  };
  return map[tier] || tier.replace(/([A-Z])/g, " $1").trim();
}

function formatBudget(job: Job): string {
  if (job.budget != null) return `$${job.budget.toLocaleString()}`;
  if (job.hourly_min != null && job.hourly_max != null) return `$${job.hourly_min}–${job.hourly_max}/hr`;
  if (job.hourly_min != null) return `From $${job.hourly_min}/hr`;
  if (job.hourly_max != null) return `Up to $${job.hourly_max}/hr`;
  return "—";
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
}

const metaItem = (icon: React.ReactNode, label: string, value: string) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-muted-foreground shrink-0">{icon}</span>
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="font-medium">{value}</p>
    </div>
  </div>
);

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
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="size-10 mx-auto mb-3 text-red-500" />
        <p className="text-red-500 font-medium">{error}</p>
        <Button variant="outline" className="mt-3" onClick={fetchJob}>Retry</Button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <Briefcase className="size-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium">Job not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FavoriteButton jobId={job.id} size="lg" />
              <h1 className="text-2xl font-bold font-heading leading-tight">{job.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {job.job_type && (
                <Badge variant="secondary" className="text-xs">
                  {job.job_type === "HOURLY" ? "Hourly" : "Fixed Price"}
                </Badge>
              )}
              {job.contractor_tier && (
                <Badge variant="outline" className="text-xs">
                  {formatExperience(job.contractor_tier)}
                </Badge>
              )}
              {job.category && (
                <Badge variant="outline" className="text-xs">
                  {job.category}
                </Badge>
              )}
              {job.payment_verified && (
                <Badge className="text-xs bg-green-500/15 text-green-600 hover:bg-green-500/20">
                  <Shield className="size-3 mr-1" /> Payment Verified
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-accent-blue hover:underline"
              >
                <ExternalLink className="size-4" />
                View on Upwork
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            {metaItem(<DollarSign className="size-4" />, "Budget", formatBudget(job))}
            {job.weekly_retainer != null && (
              <p className="text-xs text-muted-foreground mt-0.5 ml-6">${job.weekly_retainer}/wk retainer</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            {metaItem(<Clock className="size-4" />, "Posted", daysAgo(job.posted_at))}
            {job.posted_at && (
              <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                {new Date(job.posted_at).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            {metaItem(<Briefcase className="size-4" />, "Workload", job.hours_per_week || "—")}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            {metaItem(<Briefcase className="size-4" />, "Duration", job.duration_label || "—")}
            {job.duration_weeks != null && (
              <p className="text-xs text-muted-foreground mt-0.5 ml-6">{job.duration_weeks} weeks</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            {metaItem(
              <User className="size-4" />,
              "Client",
              job.client_country || job.client_name || "Unavailable"
            )}
            {job.client_rating != null && (
              <p className="text-xs text-muted-foreground mt-0.5 ml-6 flex items-center gap-1">
                <Star className="size-3 fill-yellow-500 text-yellow-500" />
                {job.client_rating}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            {metaItem(<Briefcase className="size-4" />, "Activity", "—")}
            {job.proposals_count != null && (
              <p className="text-xs text-muted-foreground mt-0.5 ml-6">{job.proposals_count} proposals</p>
            )}
            {job.total_invited != null && (
              <p className="text-xs text-muted-foreground mt-0.5 ml-6">{job.total_invited} invited</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client Details Section */}
      {(job.client_total_assignments != null || job.client_total_spend != null || job.client_industry || job.client_member_since) && (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <User className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Client History</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {job.client_total_assignments != null && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Total Hires</p>
                  <p className="text-sm font-medium">{job.client_total_hires ?? "—"} / {job.client_total_assignments}</p>
                </div>
              )}
              {job.client_total_spend != null && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Total Spent</p>
                  <p className="text-sm font-medium">${(job.client_total_spend).toLocaleString()}</p>
                </div>
              )}
              {job.client_industry && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Industry</p>
                  <p className="text-sm font-medium">{job.client_industry}</p>
                </div>
              )}
              {job.client_member_since && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Member Since</p>
                  <p className="text-sm font-medium">{new Date(job.client_member_since).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Layers className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Skills</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs font-normal">
                  {s}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {job.description && (
        <Card>
          <CardContent className="py-4 px-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Description
            </h2>
            <JobDescription text={job.description} />
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold font-heading">AI Analysis</h2>
          {!analysis && (
            <Button onClick={handleAnalyze} disabled={analyzing} size="sm">
              {analyzing ? (
                <><Loader2 className="size-4 mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><Sparkles className="size-4 mr-2" /> Analyze with AI</>
              )}
            </Button>
          )}
        </div>

        {analysis ? (
          <div className="space-y-4">
            {/* Score Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Target className="size-4" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold">Match Score</span>
                </div>
                <span className={"text-xl font-bold " + scoreColor(analysis.match_score)}>{analysis.match_score}</span>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <TrendingUp className="size-4" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold">Opportunity</span>
                </div>
                <span className={"text-xl font-bold " + scoreColor(analysis.opportunity_score)}>{analysis.opportunity_score}</span>
              </div>
              {analysis.win_probability != null && (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Briefcase className="size-4" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold">Win Probability</span>
                  </div>
                  <span className={"text-xl font-bold " + scoreColor(analysis.win_probability)}>{analysis.win_probability}%</span>
                </div>
              )}
            </div>

            {/* Skills Match */}
            {analysis.skills_match && (
              <Card>
                <CardContent className="py-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skills Match</h3>
                  {analysis.skills_match.overall_fit && (
                    <Badge variant="outline" className="text-xs">
                      {analysis.skills_match.overall_fit}
                    </Badge>
                  )}
                  {analysis.skills_match.matched_skills?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Matched Skills:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.skills_match.matched_skills.map((s: string, i: number) => (
                          <Badge key={`${s}-${i}`} className="text-xs bg-green-500/15 text-green-600 hover:bg-green-500/20">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysis.skills_match.missing_skills?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Missing Skills:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.skills_match.missing_skills.map((s: string, i: number) => (
                          <Badge key={`${s}-${i}`} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Budget Fit */}
            {analysis.budget_fit && (
              <Card>
                <CardContent className="py-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Budget Fit</h3>
                  <p className="text-sm text-muted-foreground">{analysis.budget_fit.assessment || "No assessment"}</p>
                </CardContent>
              </Card>
            )}

            {/* Client Analysis */}
            {analysis.client_analysis && (
              <Card>
                <CardContent className="py-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Client Analysis</h3>
                  <p className="text-sm text-muted-foreground">{analysis.client_analysis.recommendation || "No recommendation"}</p>
                  {analysis.client_analysis.payment_risk && (
                    <Badge variant="outline" className="mt-2 text-xs capitalize">{analysis.client_analysis.payment_risk} risk</Badge>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Competition Analysis */}
            {analysis.competition_analysis && (
              <Card>
                <CardContent className="py-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Competition</h3>
                  <p className="text-sm text-muted-foreground">{analysis.competition_analysis.advice || "No advice"}</p>
                  {analysis.competition_analysis.competition_level && (
                    <Badge variant="outline" className="mt-2 text-xs capitalize">{analysis.competition_analysis.competition_level} competition</Badge>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recommendation */}
            {analysis.recommendation && (
              <Card>
                <CardContent className="py-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recommendation</h3>
                  <p className="text-sm font-medium capitalize">{analysis.recommendation.replace("_", " ")}</p>
                  {analysis.reasoning && <p className="text-sm text-muted-foreground mt-1">{analysis.reasoning}</p>}
                </CardContent>
              </Card>
            )}

            {/* Proposal Tips */}
            {analysis.proposal_tips && analysis.proposal_tips.length > 0 && (
              <Card>
                <CardContent className="py-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Lightbulb className="size-3.5 text-yellow-500" />
                    Proposal Tips
                  </h3>
                  <ul className="space-y-1">
                    {analysis.proposal_tips.map((tip, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-yellow-500 mt-0.5">&bull;</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Red Flags */}
            {analysis.red_flags && analysis.red_flags.length > 0 && (
              <Card className="border-red-500/30">
                <CardContent className="py-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-red-500" />
                    Red Flags
                  </h3>
                  <ul className="space-y-1">
                    {analysis.red_flags.map((flag, i) => (
                      <li key={i} className="text-sm text-red-500/80 flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">&bull;</span>
                        {flag}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Re-analyze button */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Analyzed via {analysis.model_used || "keyword-fallback"}</span>
              <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? <><Loader2 className="size-3 mr-1 animate-spin" /> Re-analyzing</> : "Re-analyze"}
              </Button>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="size-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-1">No AI analysis yet</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Click the button above to analyze this job with AI. You'll get match scores, opportunity assessment, proposal tips, and more.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
