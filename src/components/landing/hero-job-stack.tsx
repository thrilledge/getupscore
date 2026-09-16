"use client";

import { useEffect, useState } from "react";
import type { LiveJob } from "./live-jobs";
import { timeAgo } from "@/lib/time-ago";
import {
  BadgeCheck,
  BrainCircuit,
  CircleCheck,
  DollarSign,
  Globe,
  Send,
  Star,
} from "lucide-react";

function heroScore(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return 70 + (hash % 29);
}

function formatRange(job: LiveJob): string {
  if (job.budget != null) return `$${job.budget.toLocaleString()}`;
  if (job.hourly_min != null && job.hourly_max != null)
    return `$${job.hourly_min}–$${job.hourly_max}/hr`;
  if (job.hourly_min != null) return `$${job.hourly_min}/hr`;
  return "—";
}

function rangeLabel(job: LiveJob): string {
  const type = (job.job_type || "").toLowerCase();
  if (type.includes("hourly")) return "Hourly Rate";
  if (type.includes("fixed")) return "Fixed Price";
  return "Budget";
}

function formatSpend(value: number | null | undefined): string | null {
  if (value == null) return null;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M Spent`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k+ Spent`;
  return `$${Math.round(value)} Spent`;
}

function getCardStyle(diff: number) {
  if (diff === 0) {
    return {
      zIndex: 5,
      transform: "translateX(0) translateY(0) scale(1)",
      opacity: 1,
    };
  }
  if (diff === 1) {
    return {
      zIndex: 4,
      transform: "translateX(10%) translateY(7%) scale(0.95)",
      opacity: 0.9,
    };
  }
  if (diff === 2) {
    return {
      zIndex: 3,
      transform: "translateX(16%) translateY(13%) scale(0.9)",
      opacity: 0.8,
    };
  }
  if (diff === 3) {
    return {
      zIndex: 2,
      transform: "translateX(20%) translateY(18%) scale(0.86)",
      opacity: 0.7,
    };
  }
  return {
    zIndex: 1,
    transform: "translateX(23%) translateY(22%) scale(0.83)",
    opacity: 0.6,
  };
}

export function HeroJobStack({
  jobs,
  intervalMs = 6500,
}: {
  jobs: LiveJob[];
  intervalMs?: number;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (jobs.length <= 1) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % jobs.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [jobs.length, intervalMs]);

  return (
    <div
      className="relative w-full overflow-visible"
      style={{ perspective: "1200px", minHeight: 420 }}
    >
      {jobs.map((job, i) => {
        const diff = ((i - active) + jobs.length) % jobs.length;
        const style = getCardStyle(diff);
        const isActive = diff === 0;
        const score = heroScore(job.id);
        const country =
          job.client_location_country || job.client_country || "Global";
        const rating = job.client_rating?.toFixed(1);
        const spend = formatSpend(job.client_total_spend);
        const verified = job.payment_verified === true;
        const proposalsLine =
          job.proposals_count != null
            ? `${job.proposals_count} proposals so far`
            : "Client hires in <3 proposals";

        return (
          <div
            key={job.id}
            className="absolute inset-0"
            style={{
              zIndex: style.zIndex,
              transform: style.transform,
              opacity: style.opacity,
              transition: "all 0.7s cubic-bezier(0.32, 0.72, 0, 1)",
              willChange: "transform, opacity",
            }}
          >
            <div
              className={`flex flex-col gap-4 rounded-[24px] border border-[#0A0A0A]/10 p-6 shadow-2xl ${
                isActive
                  ? "bg-white shadow-[0_8px_40px_rgba(0,201,139,0.14)]"
                  : "bg-white/70 backdrop-blur-2xl"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00C98B]">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-[#00C98B]" />
                  </span>
                  Live Match Event
                </span>

                <span
                  suppressHydrationWarning
                  className="rounded bg-[#0A0A0A]/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0A0A0A]/50"
                >
                  Posted {timeAgo(job.posted_at)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#0A0A0A]/5 bg-[#F7FFFC] p-4">
                <div className="flex items-center gap-4">
                  <div className="relative grid size-16 place-items-center">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 36 36"
                      className="size-16 -rotate-90"
                    >
                      <path
                        className="text-[#0A0A0A]/10"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                      />
                      <path
                        className="text-[#00C98B]"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray={`${score}, 100`}
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      />
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-lg font-bold leading-none text-[#0A0A0A]">
                        {score}
                      </span>
                      <span className="text-[9px] uppercase text-[#0A0A0A]/50">
                        score
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="inline-flex items-center gap-1 rounded bg-[#00C98B]/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#00C98B]">
                      <BadgeCheck className="size-3" />
                      TOP{" "}
                      {score >= 90 ? "1%" : score >= 80 ? "5%" : "15%"}{" "}
                      FIT SCORE
                    </span>

                    <p className="mt-1 text-sm font-bold text-[#0A0A0A]">
                      High Conversion Probability
                    </p>

                    <p className="text-xs text-[#0A0A0A]/55">
                      {proposalsLine}
                    </p>
                  </div>
                </div>

<div className="hidden flex-col items-end text-right sm:flex">
                  <span className="text-xs text-[#0A0A0A]/50">
                    {rangeLabel(job)}
                  </span>
                  <span className="text-lg font-bold text-[#00C98B]">
                    {formatRange(job)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="font-heading cursor-pointer text-base font-bold leading-snug text-[#0A0A0A] transition-colors hover:text-[#00A975]">
                  {job.title}
                </h3>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#0A0A0A]/55">
                  {verified && (
                    <>
                      <span className="inline-flex items-center gap-1 text-[#0A0A0A]">
                        <CircleCheck className="size-3.5 shrink-0 text-[#00C98B]" />
                        Payment Verified
                      </span>
                      <span aria-hidden="true">•</span>
                    </>
                  )}

                  {rating && (
                    <>
                      <span className="inline-flex items-center gap-1 text-[#00A975]">
                        <Star className="size-3.5 shrink-0 fill-[#00C98B] text-[#00C98B]" />
                        {rating}
                      </span>
                      <span aria-hidden="true">•</span>
                    </>
                  )}

                  {spend && (
                    <>
                      <span className="inline-flex items-center gap-1 text-[#0A0A0A]">
                        <DollarSign className="size-3.5 shrink-0 text-[#00C98B]" />
                        {spend}
                      </span>
                      <span aria-hidden="true">•</span>
                    </>
                  )}

                  <span className="inline-flex items-center gap-1">
                    <Globe className="size-3.5 shrink-0 text-[#0A0A0A]/45" />
                    {country}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-[#0A0A0A]/5 bg-[#0A0A0A]/5 p-3 text-sm leading-6 text-[#0A0A0A]/60">
                <BrainCircuit className="mt-0.5 size-5 shrink-0 text-[#00A975]" />

                <p className="line-clamp-3">
                  <span className="font-semibold text-[#0A0A0A]">
                    Job Brief:
                  </span>{" "}
                  {job.description?.trim() ||
                    "Freshly ingested from Upwork — match signals are being scored in real-time."}
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#0A0A0A]/5 bg-[#F7FFFC] p-3">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-[#0A0A0A]">
                  <Send className="size-4 text-[#00C98B]" />
                  Pushed to Telegram &amp; Slack
                </span>

                <span className="animate-pulse text-xs font-bold text-[#00C98B] motion-reduce:animate-none">
                  0.8s latency
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}