"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import { countryCode } from "@/lib/country-flag";
import { timeAgo } from "@/lib/time-ago";
import {
  CircleCheck,
  Clock3,
  DollarSign,
  Sparkles,
} from "lucide-react";

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

  if (job.hourly_min != null && job.hourly_max != null) {
    return `$${job.hourly_min}–${job.hourly_max}/hr`;
  }

  if (job.hourly_min != null) return `$${job.hourly_min}/hr`;

  return "—";
}

function jobTypeLabel(job: LiveJob): string {
  const type = (job.job_type || "").toLowerCase();

  if (type.includes("hourly")) return "Hourly";
  if (type.includes("fixed")) return "Fixed";

  return "—";
}

function flagBadge(countryName: string | null): ReactElement {
  const code = countryCode(countryName);

  if (!code) {
    return <span aria-hidden="true">🌍</span>;
  }

  return (
    <img
      src={`/flags/${code.toLowerCase()}.png`}
      alt={`${countryName} flag`}
      loading="lazy"
      draggable={false}
      className="size-6 rounded-sm object-cover shadow-sm"
    />
  );
}

export function LiveJobs({ jobs }: { jobs: LiveJob[] }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const country = (job: LiveJob) =>
    job.client_location_country || job.client_country || null;

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="jobs"
      className="relative scroll-mt-24 overflow-hidden border-y border-[#0A0A0A]/10 bg-[#F7FFFC] py-20 sm:py-24 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-20 size-[420px] rounded-full bg-[#00C98B]/10 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 bottom-10 size-[400px] rounded-full bg-[#00C98B]/10 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,201,139,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.05) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage:
            "radial-gradient(ellipse 80% 75% at 50% 50%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 75% at 50% 50%, black, transparent)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div
          style={{ transitionDelay: isVisible ? "100ms" : "0ms" }}
          className={`mb-10 flex flex-col items-start justify-between gap-6 transition-all duration-700 ease-out lg:mb-12 lg:flex-row lg:items-end motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
              ? "translate-y-0 opacity-100 blur-0"
              : "translate-y-10 opacity-0 blur-[4px]"
            }`}
        >
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00C98B]/25 bg-white/70 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#0A0A0A]/70 shadow-sm backdrop-blur-sm">
              <span className="relative flex size-2">
                {isVisible && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-50 motion-reduce:animate-none" />
                )}

                <span className="relative inline-flex size-2 rounded-full bg-[#00C98B]" />
              </span>

              Live from Upwork
            </div>

            <h2 className="max-w-2xl font-heading text-4xl font-bold tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl">
              Latest jobs,{" "}
              <span className="text-[#00C98B]">right now</span>
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
              Fresh opportunities pulled straight from Upwork.{" "}
              <span className="font-semibold text-[#0A0A0A]">
                {jobs.length} newest matches
              </span>{" "}
              — sign in to unlock AI scoring and instant alerts.
            </p>
          </div>

          <div className="inline-flex items-center gap-3 rounded-2xl border border-[#0A0A0A]/10 bg-white/75 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#00C98B]/40 hover:shadow-[0_15px_35px_rgba(0,201,139,0.12)]">
            <span className="grid size-10 place-items-center rounded-xl bg-[#00C98B]/10">
              <Sparkles className="size-5 text-[#00C98B]" />
            </span>

            <div>
              <p className="text-sm font-bold text-[#0A0A0A]">
                Updated automatically
              </p>

              <p className="text-xs text-[#0A0A0A]/50">
                New jobs every few minutes
              </p>
            </div>
          </div>
        </div>

        <div
          style={{ transitionDelay: isVisible ? "260ms" : "0ms" }}
          className={`overflow-hidden rounded-3xl border border-[#0A0A0A]/10 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.08)] transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
              ? "translate-y-0 opacity-100 blur-0"
              : "translate-y-12 opacity-0 blur-[5px]"
            }`}
        >
          <div className="hidden grid-cols-12 items-center gap-5 border-b border-white/10 bg-[#0A0A0A] px-6 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white/60 sm:grid">
            <div className="col-span-6">Job Details</div>
            <div className="col-span-2 border-l border-white/15 pl-5">
              Location
            </div>
            <div className="col-span-2 border-l border-white/15 pl-5">
              Budget
            </div>
            <div className="col-span-2 border-l border-white/15 pl-5">
              All Specialties
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
              <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-[#00C98B]/10">
                <Clock3 className="size-6 text-[#00C98B]" />
              </span>

              <p className="text-sm text-[#0A0A0A]/55">
                No jobs synced yet — check back in a few minutes.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#0A0A0A]/10">
              {jobs.map((job, index) => (
                <li
                  key={job.id}
                  style={{
                    transitionDelay: isVisible
                      ? `${380 + Math.min(index, 10) * 65}ms`
                      : "0ms",
                  }}
                  className={`group relative grid grid-cols-12 gap-x-4 gap-y-5 px-5 py-5 transition-all duration-700 ease-out before:absolute before:inset-y-0 before:left-0 before:w-1 before:scale-y-0 before:bg-[#00C98B] before:transition-transform before:duration-300 hover:bg-[#00C98B]/5 hover:before:scale-y-100 sm:gap-x-5 sm:px-6 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
                      ? "translate-y-0 opacity-100 blur-0"
                      : "translate-y-8 opacity-0 blur-[3px]"
                    }`}
                >
                  <div className="col-span-12 sm:col-span-6">
                    <p className="line-clamp-2 font-semibold leading-6 text-[#0A0A0A] transition-colors duration-300 group-hover:text-[#00A975]">
                      {job.title}
                    </p>

                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#0A0A0A]/45">
                      <Clock3 className="size-3.5 shrink-0 text-[#00C98B]" />
                      {timeAgo(job.posted_at)}
                    </p>
                  </div>

                  <div className="col-span-6 sm:col-span-2 sm:border-l sm:border-[#0A0A0A]/10 sm:pl-5">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0A0A0A]/40 sm:hidden">
                      Location
                    </p>

                    <p className="flex items-center">
                      <span
                        title={country(job) || "Worldwide"}
                        className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#0A0A0A]/5 transition-transform duration-300 group-hover:scale-105"
                      >
                        {flagBadge(country(job))}
                      </span>
                    </p>
                  </div>

                  <div className="col-span-6 sm:col-span-2 sm:border-l sm:border-[#0A0A0A]/10 sm:pl-5">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0A0A0A]/40 sm:hidden">
                      Budget
                    </p>

                    <p className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-[#0A0A0A]">
                      <DollarSign className="size-4 shrink-0 text-[#00C98B]" />
                      {budgetLabel(job)}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className="rounded-full border-0 bg-[#0A0A0A]/5 px-2.5 py-1 text-[10px] font-bold text-[#0A0A0A]/60 shadow-none"
                      >
                        {jobTypeLabel(job)}
                      </Badge>

                      {job.payment_verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00A975]">
                          <CircleCheck className="size-3.5" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-12 sm:col-span-2 sm:border-l sm:border-[#0A0A0A]/10 sm:pl-5">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0A0A0A]/40 sm:hidden">
                      Specialty
                    </p>

                    <span className="inline-flex max-w-full rounded-full border border-[#00C98B]/20 bg-[#00C98B]/10 px-3 py-1.5 text-xs font-semibold text-[#0A0A0A]/70">
                      <span className="line-clamp-1">
                        {job.subcategory || job.category || "General"}
                      </span>
                    </span>
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