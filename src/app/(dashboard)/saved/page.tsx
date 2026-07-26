"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FavoriteButton } from "@/components/favorite-button";
import {
  ExternalLink,
  Heart,
  Briefcase,
  AlertTriangle,
  Clock,
  DollarSign,
} from "lucide-react";

type SavedJobItem = {
  id: string;
  upwork_job_id: string;
  title: string;
  url: string | null;
  budget: number | null;
  hourly_min: number | null;
  hourly_max: number | null;
  job_type: string | null;
  contractor_tier: string | null;
  skills: string[] | null;
  client_country: string | null;
  posted_at: string | null;
  saved_at: string;
};

export default function SavedJobsPage() {
  const [jobs, setJobs] = useState<SavedJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saved-jobs");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const { jobs: data } = await res.json();
      setJobs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  function daysAgo(dateStr: string | null): string {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 0) return "Just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-heading flex items-center gap-3">
          <Heart className="size-7 text-red-500 fill-red-500" />
          Saved Jobs
        </h1>
        <p className="text-muted-foreground mt-1">
          Jobs you&apos;ve bookmarked for later review or applying.
        </p>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertTriangle className="size-6 mx-auto mb-2 text-red-500" />
          <p className="text-red-500 font-medium text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchSaved}>Retry</Button>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="rounded-lg border border-border/60 p-12 text-center">
          <Heart className="size-10 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="font-semibold text-lg mb-1">No saved jobs yet</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Click the <Heart className="size-3.5 inline text-red-400" /> icon on any job to save it here for later.
          </p>
        </div>
      )}

      {!loading && !error && jobs.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="w-8"></th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-3">Title</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-3">Type</th>
                <th className="text-right font-semibold text-muted-foreground px-4 py-3">Budget</th>
                <th className="text-right font-semibold text-muted-foreground px-4 py-3">Saved</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <FavoriteButton jobId={job.id} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/jobs/${job.id}`} className="font-medium text-foreground hover:text-accent-blue transition-colors">
                      {job.title}
                    </Link>
                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {job.skills.slice(0, 3).map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {job.job_type === "HOURLY" ? "Hourly" : job.job_type === "FIXED_PRICE" ? "Fixed" : "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {job.budget != null
                      ? `$${job.budget}`
                      : job.hourly_min != null
                        ? `$${job.hourly_min}–${job.hourly_max}/hr`
                        : "—"
                    }
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">{daysAgo(job.saved_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline">
                        <ExternalLink className="size-3" /> View
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
