"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import { countryCode } from "@/lib/country-flag";
import { timeAgo } from "@/lib/time-ago";
import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  Clock3,
  DollarSign,
  RefreshCw,
} from "lucide-react";

export type LiveJob = {
  id: string;
  title: string;
  description: string | null;
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
  proposals_count: number | null;
  client_total_spend: number | null;
  client_rating: number | null;
};

function budgetLabel(job: LiveJob): string {
  if (job.budget != null) return `$${job.budget.toLocaleString()}`;

  if (job.hourly_min != null && job.hourly_max != null) {
    return `$${job.hourly_min} – $${job.hourly_max} / hr`;
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
    return <span aria-hidden="true">🌐</span>;
  }

  return (
    <img
      src={`/flags/${code.toLowerCase()}.png`}
      alt={`${countryName} flag`}
      loading="lazy"
      draggable={false}
      className="size-4 rounded-sm object-cover shadow-sm"
    />
  );
}

function previewScore(job: LiveJob): number {
  let hash = 0;
  const seed = String(job.id);

  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  let score = 70 + (hash % 29);

  if (job.payment_verified) score = Math.min(99, score + 3);
  if ((job.proposals_count ?? 0) >= 10) score = Math.max(60, score - 5);

  return score;
}

const categoryOptions = [
  "All Engineering & Design",
  "Web Development",
  "Mobile Development",
  "Design & Creative",
  "Writing & Content",
];

const locationOptions = ["Worldwide & US Only", "US Only", "Worldwide", "Europe", "Asia"];

const budgetOptions = [">$50/hr or >$1,000 Fixed", ">$30/hr or >$500 Fixed", ">$100/hr only", "Fixed >$2,000"];

export function LiveJobs({ jobs }: { jobs: LiveJob[] }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const filterBarRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [seconds, setSeconds] = useState(142);
  const [openFilter, setOpenFilter] = useState<"category" | "location" | "budget" | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categoryOptions[0]);
  const [selectedLocation, setSelectedLocation] = useState(locationOptions[0]);
  const [selectedBudget, setSelectedBudget] = useState(budgetOptions[0]);

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

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((current) => (current <= 1 ? 180 : current - 1));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="live-jobs"
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

              Live from Upwork Telemetry
            </div>

            <h2 className="max-w-2xl font-heading text-4xl font-bold leading-[1.1] tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl">
              Fresh opportunities pulled{" "}
              <span className="text-[#00C98B]">straight from Upwork.</span>
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
              10 newest verified jobs — sign in to unlock tailored proposal
              generation, client spend analytics, and automated push alerts.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 text-sm font-medium text-[#0A0A0A]/55">
            <RefreshCw className="size-4 animate-spin text-[#00C98B] motion-reduce:animate-none" />

            <span>
              Feed refreshes in:{" "}
              <span className="font-bold tabular-nums text-[#00C98B]">
                {seconds}s
              </span>
            </span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div
          ref={filterBarRef}
          style={{ transitionDelay: isVisible ? "220ms" : "0ms" }}
          className={`relative mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[#0A0A0A]/10 bg-white/70 p-2 shadow-sm backdrop-blur-sm transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
            ? "translate-y-0 opacity-100 blur-0"
            : "translate-y-8 opacity-0 blur-[3px]"
            }`}
        >
          {/* Category chip + dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilter(openFilter === "category" ? null : "category")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${openFilter === "category" ? "bg-[#0A0A0A]/10 text-[#0A0A0A]" : "bg-[#0A0A0A]/5 text-[#0A0A0A]/70 hover:bg-[#0A0A0A]/10"}`}
            >
              Category: {selectedCategory}
              <ChevronDown className={`size-3.5 text-[#0A0A0A]/40 transition-transform ${openFilter === "category" ? "rotate-180" : ""}`} />
            </button>
            {openFilter === "category" && (
              <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-[#0A0A0A]/10 bg-white p-1 shadow-xl">
                {categoryOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { setSelectedCategory(opt); setOpenFilter(null); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${opt === selectedCategory ? "bg-[#00C98B]/10 text-[#00A975]" : "text-[#0A0A0A]/70 hover:bg-[#0A0A0A]/5"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Location chip + dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilter(openFilter === "location" ? null : "location")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${openFilter === "location" ? "bg-[#0A0A0A]/10 text-[#0A0A0A]" : "bg-[#0A0A0A]/5 text-[#0A0A0A]/70 hover:bg-[#0A0A0A]/10"}`}
            >
              Location: {selectedLocation}
              <ChevronDown className={`size-3.5 text-[#0A0A0A]/40 transition-transform ${openFilter === "location" ? "rotate-180" : ""}`} />
            </button>
            {openFilter === "location" && (
              <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-[#0A0A0A]/10 bg-white p-1 shadow-xl">
                {locationOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { setSelectedLocation(opt); setOpenFilter(null); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${opt === selectedLocation ? "bg-[#00C98B]/10 text-[#00A975]" : "text-[#0A0A0A]/70 hover:bg-[#0A0A0A]/5"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Budget chip + dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilter(openFilter === "budget" ? null : "budget")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${openFilter === "budget" ? "bg-[#0A0A0A]/10 text-[#0A0A0A]" : "bg-[#0A0A0A]/5 text-[#0A0A0A]/70 hover:bg-[#0A0A0A]/10"}`}
            >
              Budget: {selectedBudget}
              <ChevronDown className={`size-3.5 text-[#0A0A0A]/40 transition-transform ${openFilter === "budget" ? "rotate-180" : ""}`} />
            </button>
            {openFilter === "budget" && (
              <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-[#0A0A0A]/10 bg-white p-1 shadow-xl">
                {budgetOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { setSelectedBudget(opt); setOpenFilter(null); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${opt === selectedBudget ? "bg-[#00C98B]/10 text-[#00A975]" : "text-[#0A0A0A]/70 hover:bg-[#0A0A0A]/5"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Verified toggle */}
          <button
            type="button"
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${verifiedOnly ? "bg-[#00C98B]/15 text-[#00A975]" : "bg-[#0A0A0A]/5 text-[#0A0A0A]/70 hover:bg-[#0A0A0A]/10"}`}
          >
            <CircleCheck className="size-3.5 text-[#00C98B]" />
            Verified Clients Only
          </button>
        </div>

        <div
          style={{ transitionDelay: isVisible ? "260ms" : "0ms" }}
          className={`overflow-hidden rounded-3xl border border-[#0A0A0A]/10 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.08)] transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
            ? "translate-y-0 opacity-100 blur-0"
            : "translate-y-12 opacity-0 blur-[5px]"
            }`}
        >
          <div className="hidden grid-cols-12 items-center gap-5 border-b border-white/10 bg-[#0A0A0A] px-6 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white/60 sm:grid">
            <div className="col-span-4">Lead / Project</div>
            <div className="col-span-3 border-l border-white/15 pl-5">
              Age &amp; Client Country
            </div>
            <div className="col-span-2 border-l border-white/15 pl-5">
              Compensation
            </div>
            <div className="col-span-2 border-l border-white/15 pl-5">
              Domain Match
            </div>
            <div className="col-span-1 border-l border-white/15 pl-3 text-right">
              UpScore
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
              {jobs.map((job, index) => {
                const score = previewScore(job);
                const scoreColor =
                  score >= 90
                    ? "text-[#00A975] bg-[#00C98B]/10"
                    : score >= 80
                      ? "text-[#0C8A62] bg-[#0A0A0A]/5"
                      : "text-[#0A0A0A]/50 bg-[#0A0A0A]/5";
                const countryName = country(job);

                return (
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
                    {/* Lead / Project */}
                    <div className="col-span-12 sm:col-span-4">
                      <p className="line-clamp-2 font-heading text-[15px] font-semibold leading-6 text-[#0A0A0A] transition-colors duration-300 group-hover:text-[#00A975]">
                        {job.title}
                      </p>

                      {job.description && (
                        <p className="mt-1 line-clamp-1 text-sm text-[#0A0A0A]/45">
                          {job.description}
                        </p>
                      )}
                    </div>

                    {/* Age & Client Country */}
                    <div className="col-span-6 sm:col-span-3 sm:border-l sm:border-[#0A0A0A]/10 sm:pl-5">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0A0A0A]/40 sm:hidden">
                        Age &amp; Country
                      </p>

                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-[#0A0A0A]">
                          {flagBadge(countryName)}
                          {countryName || "Global Client"}
                        </span>

                        <span className="text-xs text-[#0A0A0A]/45">
                          {timeAgo(job.posted_at)}
                          {job.proposals_count != null && (
                            <> · {job.proposals_count} proposals</>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Compensation */}
                    <div className="col-span-6 sm:col-span-2 sm:border-l sm:border-[#0A0A0A]/10 sm:pl-5">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0A0A0A]/40 sm:hidden">
                        Compensation
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
                      </div>
                    </div>

                    {/* Domain Match */}
                    <div className="col-span-6 sm:col-span-2 sm:border-l sm:border-[#0A0A0A]/10 sm:pl-5">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0A0A0A]/40 sm:hidden">
                        Domain Match
                      </p>

                      <span className="inline-flex max-w-full rounded-full border border-[#00C98B]/20 bg-[#00C98B]/10 px-3 py-1.5 text-xs font-semibold text-[#0A0A0A]/70">
                        <span className="line-clamp-1">
                          {job.subcategory || job.category || "General"}
                        </span>
                      </span>
                    </div>

                    {/* UpScore */}
                    <div className="col-span-6 sm:col-span-1 sm:flex sm:items-center sm:justify-end sm:border-l sm:border-[#0A0A0A]/10 sm:pl-3">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0A0A0A]/40 sm:hidden">
                        UpScore
                      </p>

                      <span
                        className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums ${scoreColor}`}
                      >
                        {score} / 100
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Crawler Status Bar */}
          <div className="flex flex-col items-center justify-between gap-2 border-t border-[#0A0A0A]/10 bg-[#F7FFFC] px-5 py-4 text-xs text-[#0A0A0A]/55 sm:flex-row sm:px-6">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 animate-ping rounded-full bg-[#00C98B] motion-reduce:animate-none" />
              UpScore Bot crawling 18 Upwork categories at 60s frequency
            </span>

            <a
              href="#pricing"
              className="inline-flex items-center gap-1 font-bold text-[#00A975] transition-opacity hover:underline hover:opacity-80"
            >
              Unlock all 450+ daily high-tier feeds
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}