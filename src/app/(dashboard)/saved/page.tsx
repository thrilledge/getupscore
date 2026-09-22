"use client";

import {
  useState,
  useEffect,
  useCallback,
} from "react";
import Link from "next/link";
import { SubscriptionGate } from "@/components/subscription-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FavoriteButton } from "@/components/favorite-button";
import { formatJobType } from "@/lib/format-job";
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
      const response = await fetch("/api/saved-jobs");

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          body.error || `HTTP ${response.status}`
        );
      }

      const { jobs: data } = await response.json();

      setJobs(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  function daysAgo(dateString: string | null): string {
    if (!dateString) return "";

    const difference =
      Date.now() - new Date(dateString).getTime();

    if (difference < 0) return "Just now";

    const minutes = Math.floor(difference / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours}h ago`;

    return `${Math.floor(hours / 24)}d ago`;
  }

  function jobTypeLabel(jobType: string | null) {
    return formatJobType(jobType);
  }

  function budgetLabel(job: SavedJobItem) {
    if (job.budget != null) {
      return `$${job.budget}`;
    }

    if (job.hourly_min != null) {
      return `$${job.hourly_min}–${job.hourly_max ?? job.hourly_min
        }/hr`;
    }

    return "Price not mention";
  }

  return (
    <SubscriptionGate feature="Saved Jobs">
      <div className="mx-auto w-full max-w-[1600px] min-w-0 space-y-4 overflow-x-clip pb-6 sm:space-y-5">
        {/* Header */}
        <section className="animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden rounded-[18px] border border-[#0A0A0A]/10 bg-[#EFF1F3] px-4 py-4 text-[#0A0A0A] shadow-[0_10px_25px_rgba(0,0,0,0.05)] duration-500 min-[480px]:px-5 min-[480px]:py-5 sm:rounded-[22px] sm:px-6 lg:px-7 lg:py-6 dark:border-white/10 dark:bg-[#0A0A0A] dark:text-white dark:shadow-[0_14px_35px_rgba(0,0,0,0.12)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-35"
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
            className="pointer-events-none absolute -right-16 -top-20 size-60 rounded-full bg-[#00C98B]/15 blur-[100px]"
          />

          <div className="relative z-10 flex min-w-0 flex-col gap-4 min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B] sm:size-11 sm:rounded-2xl">
                <Heart className="size-[18px] fill-[#00C98B]/15 sm:size-5" />
              </span>

              <div className="min-w-0">
                <h1 className="font-heading text-xl font-bold tracking-tight min-[420px]:text-2xl sm:text-3xl">
                  Saved Jobs
                </h1>

                <p className="mt-1 max-w-xl text-xs leading-5 text-[#0A0A0A]/55 min-[420px]:text-sm min-[420px]:leading-6 dark:text-white/50">
                  Jobs you&apos;ve bookmarked for later
                  review or applying.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center">
              <span className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#00C98B]/25 bg-[#00C98B]/10 px-3 text-xs font-semibold text-[#00C98B]">
                <Briefcase className="size-3.5" />

                {loading ? "..." : jobs.length} saved{" "}
                {jobs.length === 1 ? "job" : "jobs"}
              </span>
            </div>
          </div>
        </section>

        {/* Loading state */}
        {loading && (
          <>
            {/* Mobile and tablet loading cards */}
            <div className="grid min-w-0 gap-3 min-[680px]:grid-cols-2 lg:hidden">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-[18px] border border-[#0A0A0A]/10 bg-white shadow-[0_7px_24px_rgba(0,0,0,0.035)]"
                >
                  <div className="h-[3px] bg-[#00C98B]" />

                  <div className="space-y-4 p-4 sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <Skeleton className="size-9 shrink-0 rounded-xl bg-[#00C98B]/10" />

                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-[82%] bg-[#0A0A0A]/10" />
                        <Skeleton className="h-4 w-[58%] bg-[#0A0A0A]/10" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Skeleton className="h-5 w-14 rounded-full bg-[#00C98B]/10" />
                      <Skeleton className="h-5 w-16 rounded-full bg-[#00C98B]/10" />
                      <Skeleton className="h-5 w-12 rounded-full bg-[#00C98B]/10" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-[#0A0A0A]/10 pt-3">
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-12 bg-[#0A0A0A]/10" />
                        <Skeleton className="h-4 w-20 bg-[#0A0A0A]/10" />
                      </div>

                      <div className="space-y-1.5">
                        <Skeleton className="ml-auto h-3 w-12 bg-[#0A0A0A]/10" />
                        <Skeleton className="ml-auto h-4 w-16 bg-[#0A0A0A]/10" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop loading table */}
            <div className="hidden overflow-hidden rounded-[20px] border border-[#0A0A0A]/10 bg-white shadow-[0_7px_24px_rgba(0,0,0,0.035)] lg:block">
              <div className="grid grid-cols-[45px_minmax(260px,1fr)_110px_150px_100px_70px] gap-4 bg-[#0A0A0A] px-4 py-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <Skeleton
                    key={item}
                    className="h-3 bg-white/10"
                  />
                ))}
              </div>

              <div className="divide-y divide-[#0A0A0A]/10">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 px-4 py-4"
                  >
                    <Skeleton className="size-8 rounded-xl bg-[#00C98B]/10" />

                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-[60%] bg-[#0A0A0A]/10" />

                      <div className="flex gap-1.5">
                        <Skeleton className="h-4 w-14 rounded-full bg-[#00C98B]/10" />
                        <Skeleton className="h-4 w-16 rounded-full bg-[#00C98B]/10" />
                        <Skeleton className="h-4 w-12 rounded-full bg-[#00C98B]/10" />
                      </div>
                    </div>

                    <Skeleton className="h-6 w-16 rounded-full bg-[#00C98B]/10" />
                    <Skeleton className="h-4 w-20 bg-[#0A0A0A]/10" />
                    <Skeleton className="h-4 w-14 bg-[#0A0A0A]/10" />
                    <Skeleton className="h-4 w-12 bg-[#00C98B]/10" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Error state */}
        {error && (
          <section className="animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-[18px] border border-[#0A0A0A]/10 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.045)] duration-500 sm:rounded-[20px]">
            <div className="h-[3px] bg-[#0A0A0A]" />

            <div className="flex flex-col items-center px-4 py-8 text-center sm:px-6 sm:py-10">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#00C98B]/10 text-[#00A975] sm:size-12">
                <AlertTriangle className="size-5" />
              </span>

              <h2 className="mt-4 font-heading text-base font-bold text-[#0A0A0A] sm:text-lg">
                Failed to load saved jobs
              </h2>

              <p className="mt-1 max-w-md break-words text-xs leading-5 text-[#0A0A0A]/50 sm:text-sm sm:leading-6">
                {error}
              </p>

              <Button
                variant="outline"
                size="sm"
                className="mt-4 h-9 rounded-xl border-[#0A0A0A]/10 bg-white px-4 font-semibold text-[#0A0A0A] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/5 hover:text-[#00A975]"
                onClick={fetchSaved}
              >
                Retry
              </Button>
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && !error && jobs.length === 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-3 relative overflow-hidden rounded-[18px] border border-[#0A0A0A]/10 bg-[#EFF1F3] text-[#0A0A0A] shadow-[0_12px_32px_rgba(0,0,0,0.06)] duration-500 sm:rounded-[22px] dark:border-white/10 dark:bg-[#0A0A0A] dark:text-white dark:shadow-[0_16px_45px_rgba(0,0,0,0.13)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,201,139,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.07) 1px, transparent 1px)",
                backgroundSize: "44px 44px",
                maskImage:
                  "radial-gradient(circle at center, black, transparent 75%)",
                WebkitMaskImage:
                  "radial-gradient(circle at center, black, transparent 75%)",
              }}
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00C98B]/15 blur-[100px]"
            />

            <div className="relative z-10 flex flex-col items-center px-4 py-10 text-center sm:px-6 sm:py-12">
              <span className="relative grid size-14 place-items-center rounded-[18px] border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B] shadow-[0_15px_35px_rgba(0,201,139,0.1)] sm:size-16 sm:rounded-[20px]">
                <Heart className="size-6 sm:size-7" />

                <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[#0A0A0A] bg-[#00C98B]" />
              </span>

              <h2 className="mt-5 font-heading text-lg font-bold sm:text-xl">
                No saved jobs yet
              </h2>

              <p className="mt-2 max-w-md text-xs leading-5 text-[#0A0A0A]/55 sm:text-sm sm:leading-6 dark:text-white/50">
                Click the heart icon on any job to save it
                here for later review or applying.
              </p>

              <Link
                href="/jobs"
                className="group mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-[#00C98B] px-5 text-sm font-bold text-[#0A0A0A] shadow-[0_12px_30px_rgba(0,201,139,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#00C98B]/90 hover:shadow-[0_16px_36px_rgba(0,201,139,0.24)]"
              >
                <Briefcase className="size-4" />
                Browse jobs
                <ExternalLink className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </section>
        )}

        {/* Mobile and tablet saved job cards */}
        {!loading && !error && jobs.length > 0 && (
          <div className="grid min-w-0 gap-3 min-[680px]:grid-cols-2 lg:hidden">
            {jobs.map((job) => (
              <article
                key={job.id}
                className="group animate-in fade-in slide-in-from-bottom-2 min-w-0 overflow-hidden rounded-[18px] border border-[#0A0A0A]/10 bg-white shadow-[0_7px_24px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/30 hover:shadow-[0_12px_30px_rgba(0,201,139,0.08)]"
              >
                <div className="h-[3px] bg-[#00C98B]" />

                <div className="min-w-0 p-4 sm:p-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#00C98B]/10">
                      <FavoriteButton jobId={job.id} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="line-clamp-2 break-words font-heading text-sm font-bold leading-5 text-[#0A0A0A] transition-colors hover:text-[#00A975] sm:text-[15px]"
                      >
                        {job.title}
                      </Link>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-[#00C98B]/10 px-2 py-0.5 text-[10px] font-semibold text-[#008F64]"
                        >
                          <Briefcase className="mr-1 size-3" />
                          {jobTypeLabel(job.job_type)}
                        </Badge>

                        {job.client_country && (
                          <Badge
                            variant="outline"
                            className="max-w-full truncate rounded-full border-[#0A0A0A]/10 bg-white px-2 py-0.5 text-[10px] font-medium text-[#0A0A0A]/55"
                          >
                            {job.client_country}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
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
                        <span className="inline-flex items-center text-[10px] font-medium text-[#0A0A0A]/40">
                          +{job.skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#0A0A0A]/10 pt-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A]/35">
                        Budget
                      </p>

                      <p className="mt-1 flex min-w-0 items-center gap-1 text-xs font-bold tabular-nums text-[#0A0A0A] sm:text-sm">
                        <DollarSign className="size-3.5 shrink-0 text-[#00A975]" />
                        <span className="truncate">
                          {budgetLabel(job)}
                        </span>
                      </p>
                    </div>

                    <div className="min-w-0 text-right">
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A]/35">
                        Saved
                      </p>

                      <p className="mt-1 flex items-center justify-end gap-1 text-xs text-[#0A0A0A]/50">
                        <Clock className="size-3.5 shrink-0 text-[#00A975]" />
                        <span className="whitespace-nowrap">
                          {daysAgo(job.saved_at)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="inline-flex h-9 min-w-0 flex-1 items-center justify-center rounded-xl bg-[#0A0A0A] px-3 text-xs font-bold text-white transition-all duration-300 hover:bg-[#00C98B] hover:text-[#0A0A0A]"
                    >
                      View details
                    </Link>

                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View job on Upwork"
                        className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#0A0A0A]/10 bg-white text-[#00A975] transition-all duration-300 hover:border-[#00C98B]/30 hover:bg-[#00C98B]/10"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Desktop saved jobs table */}
        {!loading && !error && jobs.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-2 hidden min-w-0 overflow-hidden rounded-[20px] border border-[#0A0A0A]/10 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.045)] duration-500 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-[#0A0A0A]/10 bg-[#EFF1F3] dark:border-white/10 dark:bg-[#0A0A0A]">
                    <th className="w-12 px-4 py-3.5" />

                    <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A]/55 dark:text-white/50">
                      Title
                    </th>

                    <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A]/55 dark:text-white/50">
                      Type
                    </th>

                    <th className="px-4 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A]/55 dark:text-white/50">
                      Budget
                    </th>

                    <th className="px-4 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A]/55 dark:text-white/50">
                      Saved
                    </th>

                    <th className="px-4 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A]/55 dark:text-white/50">
                      Source
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#0A0A0A]/10">
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="group transition-all duration-200 hover:bg-[#00C98B]/5"
                    >
                      <td className="px-4 py-3.5">
                        <span className="grid size-9 place-items-center rounded-xl bg-[#00C98B]/10 transition-colors duration-300 group-hover:bg-[#00C98B]/15">
                          <FavoriteButton jobId={job.id} />
                        </span>
                      </td>

                      <td className="min-w-[280px] px-4 py-3.5">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="line-clamp-1 font-heading font-semibold text-[#0A0A0A] transition-colors hover:text-[#00A975]"
                        >
                          {job.title}
                        </Link>

                        {job.skills &&
                          job.skills.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {job.skills
                                .slice(0, 3)
                                .map((skill) => (
                                  <Badge
                                    key={skill}
                                    variant="outline"
                                    className="rounded-full border-[#00C98B]/20 bg-[#00C98B]/5 px-1.5 py-0 text-[9px] font-medium text-[#008F64]"
                                  >
                                    {skill}
                                  </Badge>
                                ))}

                              {job.skills.length > 3 && (
                                <span className="self-center text-[9px] text-[#0A0A0A]/35">
                                  +{job.skills.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="size-3.5 text-[#00A975]" />

                          <Badge
                            variant="secondary"
                            className="rounded-full bg-[#00C98B]/10 px-2 py-0.5 text-[10px] font-semibold text-[#008F64]"
                          >
                            {jobTypeLabel(job.job_type)}
                          </Badge>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <DollarSign className="size-3.5 text-[#00A975]" />

                          <span className="font-bold tabular-nums text-[#0A0A0A]">
                            {budgetLabel(job)}
                          </span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#0A0A0A]/45">
                          <Clock className="size-3.5 text-[#00A975]" />
                          {daysAgo(job.saved_at)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#00A975] transition-colors hover:bg-[#00C98B]/10 hover:text-[#00C98B]"
                          >
                            <ExternalLink className="size-3" />
                            View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </SubscriptionGate>
  );
}