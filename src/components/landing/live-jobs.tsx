import { Badge } from "@/components/ui/badge";
import { countryFlag } from "@/lib/country-flag";
import { timeAgo } from "@/lib/time-ago";
import { CircleCheck, Globe2, Clock3, DollarSign } from "lucide-react";

export type LiveJob = {
  id: string;
  title: string;
  posted_at: string | null;
  budget: number | null;
  hourly_min: number | null;
  hourly_max: number | null;
  job_type: string | null;
  client_country: string | null;
  client_location_country: string | null;
  payment_verified: boolean | null;
  category: string | null;
  subcategory: string | null;
};

function budgetLabel(job: LiveJob): string {
  if (job.budget != null) return `$${job.budget}`;
  if (job.hourly_min != null && job.hourly_max != null) return `$${job.hourly_min}–${job.hourly_max}/hr`;
  if (job.hourly_min != null) return `$${job.hourly_min}/hr`;
  return "—";
}

function jobTypeLabel(job: LiveJob): string {
  const t = (job.job_type || "").toLowerCase();
  if (t.includes("hourly")) return "Hourly";
  if (t.includes("fixed")) return "Fixed";
  return "—";
}

export function LiveJobs({ jobs }: { jobs: LiveJob[] }) {
  const country = (j: LiveJob) =>
    j.client_location_country || j.client_country || null;

  return (
    <section id="jobs" className="scroll-mt-24 border-y border-border/40 bg-muted/20 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent-blue">
              <span className="size-1.5 rounded-full bg-accent-green" />
              Live from Upwork
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Latest jobs, right now
            </h2>
            <p className="mt-2 max-w-lg text-muted-foreground">
              Fresh opportunities pulled straight from Upwork.{" "}
              <span className="font-medium text-foreground">{jobs.length} newest matches</span>{" "}
              — sign in to unlock AI scoring and instant alerts.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          {/* Table header */}
          <div className="hidden grid-cols-12 gap-4 border-b border-border/60 bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
            <div className="col-span-5">Job Details</div>
            <div className="col-span-3">Location</div>
            <div className="col-span-2">Budget</div>
            <div className="col-span-2">All Specialties</div>
          </div>

          {jobs.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No jobs synced yet — check back in a few minutes.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="grid grid-cols-12 gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-muted/20"
                >
                  {/* Job Details */}
                  <div className="col-span-12 sm:col-span-5">
                    <p className="font-medium leading-snug text-foreground line-clamp-2">
                      {job.title}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock3 className="size-3.5 shrink-0" />
                      {timeAgo(job.posted_at)}
                    </p>
                  </div>

                  {/* Location */}
                  <div className="col-span-6 sm:col-span-3">
                    <p className="flex items-center gap-1.5 text-sm text-foreground">
                      <span aria-hidden className="text-base leading-none">
                        {countryFlag(country(job))}
                      </span>
                      <span className="line-clamp-1">{country(job) || "Worldwide"}</span>
                    </p>
                    <p className="mt-1.5 hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                      <Globe2 className="size-3.5 shrink-0" />
                      Client location
                    </p>
                  </div>

                  {/* Budget */}
                  <div className="col-span-6 sm:col-span-2">
                    <p className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-foreground">
                      <DollarSign className="size-3.5 shrink-0 text-muted-foreground/60" />
                      {budgetLabel(job)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {jobTypeLabel(job)}
                      </Badge>
                      {job.payment_verified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-green">
                          <CircleCheck className="size-3" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Specialties */}
                  <div className="col-span-12 sm:col-span-2">
                    <p className="text-sm text-foreground line-clamp-1">
                      {job.subcategory || job.category || "General"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
