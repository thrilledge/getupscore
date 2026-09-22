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

  if (job.hourly_min != null && job.hourly_max != null) {
    return `$${job.hourly_min}–$${job.hourly_max}/hr`;
  }

  if (job.hourly_min != null) return `$${job.hourly_min}/hr`;

  return "—";
}

function rangeLabel(job: LiveJob): string {
  const type = (job.job_type || "").toLowerCase();

  if (type.includes("hourly")) return "Hourly Rate";
  if (type.includes("fixed")) return "Fixed Price";

  return "Budget";
}

function formatSpend(
  value: number | null | undefined
): string | null {
  if (value == null) return null;

  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M Spent`;
  }

  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k+ Spent`;
  }

  return `$${Math.round(value)} Spent`;
}

/**
 * Premium stack positioning.
 *
 * IMPORTANT:
 * We intentionally DO NOT use opacity on the wrapper.
 * Opacity was causing the entire card contents to become faded.
 *
 * Instead:
 * - active card = completely solid
 * - second card = slightly smaller
 * - deeper cards = progressively smaller
 * - visual depth comes from scale / shadow / background
 */
function getCardStyle(diff: number) {
  switch (diff) {
    case 0:
      return {
        zIndex: 50,
        transform: "translate3d(0, 0px, 0) scale(1)",
        opacity: 1,
        filter: "blur(0px)",
      };

    case 1:
      return {
        zIndex: 40,
        transform: "translate3d(0, 18px, 0) scale(0.955)",
        opacity: 1,
        filter: "blur(0px)",
      };

    case 2:
      return {
        zIndex: 30,
        transform: "translate3d(0, 36px, 0) scale(0.91)",
        opacity: 0.96,
        filter: "blur(0px)",
      };

    case 3:
      return {
        zIndex: 20,
        transform: "translate3d(0, 54px, 0) scale(0.865)",
        opacity: 0.82,
        filter: "blur(0.2px)",
      };

    default:
      return {
        zIndex: 10,
        transform: "translate3d(0, 68px, 0) scale(0.82)",
        opacity: 0,
        filter: "blur(1px)",
      };
  }
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

    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % jobs.length);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [jobs.length, intervalMs]);

  if (!jobs.length) return null;

  return (
    <div
      className="relative mx-auto w-full max-w-2xl overflow-visible"
      style={{
        minHeight: 455,
        perspective: "1200px",
      }}
    >
      {jobs.map((job, i) => {
        const diff =
          (i - active + jobs.length) % jobs.length;

        const style = getCardStyle(diff);
        const isActive = diff === 0;

        const score = heroScore(job.id);

        const country =
          job.client_location_country ||
          job.client_country ||
          "Global";

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
            className="absolute inset-x-0 top-0"
            style={{
              zIndex: style.zIndex,
              transform: style.transform,
              opacity: style.opacity,
              filter: style.filter,

              /*
               * Keep the animation smooth without affecting
               * the visual opacity of child content.
               */
              transition:
                "transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease, filter 500ms ease",

              willChange: "transform, opacity",
              pointerEvents: isActive ? "auto" : "none",
            }}
          >
            <article
              className={[
                "group relative overflow-hidden rounded-[28px]",
                "border",
                "backdrop-blur-2xl",
                "transition-all duration-500",
                isActive
                  ? [
                    "border-white/[0.12]",
                    "bg-[#111614]",
                    "shadow-[0_30px_90px_rgba(0,0,0,0.55)]",
                  ].join(" ")
                  : [
                    "border-white/[0.07]",
                    "bg-[#0c100f]",
                    "shadow-[0_20px_50px_rgba(0,0,0,0.35)]",
                  ].join(" "),
              ].join(" ")}
            >
              {/* Ambient green glow */}
              <div
                aria-hidden="true"
                className={[
                  "pointer-events-none absolute -right-24 -top-24",
                  "size-64 rounded-full bg-[#00C98B]/10",
                  "blur-3xl",
                  "transition-opacity duration-500",
                  isActive ? "opacity-100" : "opacity-40",
                ].join(" ")}
              />

              {/* Subtle top highlight */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />

              {/* Inner content */}
              <div className="relative flex flex-col gap-5 p-6">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#00C98B]">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-60 motion-reduce:animate-none" />
                      <span className="relative inline-flex size-2 rounded-full bg-[#00C98B] shadow-[0_0_12px_rgba(0,201,139,0.8)]" />
                    </span>

                    Live Match Event
                  </span>

                  <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium tracking-wide text-white/50">
                    Posted {timeAgo(job.posted_at)}
                  </span>
                </div>

                {/* Score + Budget */}
                <div className="relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/30 p-4">
                  {/* Score glow */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 top-1/2 size-24 -translate-y-1/2 rounded-full bg-[#00C98B]/10 blur-2xl"
                  />

                  <div className="relative flex items-center gap-4">
                    {/* Score ring */}
                    <div className="relative grid size-14 shrink-0 place-items-center">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 36 36"
                        className="size-14 -rotate-90"
                      >
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-white/[0.08]"
                        />

                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${score}, 100`}
                          className="text-[#00C98B]"
                          style={{
                            filter:
                              "drop-shadow(0 0 4px rgba(0,201,139,0.45))",
                          }}
                        />
                      </svg>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-base font-bold leading-none text-white">
                          {score}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#00C98B]/20 bg-[#00C98B]/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#00C98B]">
                        <BadgeCheck className="size-3" />
                        TOP{" "}
                        {score >= 90
                          ? "1%"
                          : score >= 80
                            ? "5%"
                            : "15%"}{" "}
                        FIT
                      </span>

                      <p className="mt-1.5 text-sm font-semibold text-white/90">
                        High Conversion Probability
                      </p>

                      <p className="mt-0.5 text-[11px] text-white/45">
                        {proposalsLine}
                      </p>
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="hidden shrink-0 flex-col items-end text-right sm:flex">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                      {rangeLabel(job)}
                    </span>

                    <span className="mt-1 text-lg font-bold tracking-tight text-[#00C98B]">
                      {formatRange(job)}
                    </span>
                  </div>
                </div>

                {/* Job title */}
                <div className="flex flex-col gap-2.5">
                  <h3 className="cursor-pointer text-lg font-bold leading-snug text-white transition-colors duration-200 hover:text-[#00C98B]">
                    {job.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-white/55">
                    {verified && (
                      <span className="inline-flex items-center gap-1.5 text-white/80">
                        <CircleCheck className="size-3.5 shrink-0 text-[#00C98B]" />
                        Payment Verified
                      </span>
                    )}

                    {rating && (
                      <span className="inline-flex items-center gap-1 text-white/80">
                        <Star className="size-3.5 shrink-0 fill-[#00C98B] text-[#00C98B]" />
                        {rating}
                      </span>
                    )}

                    {spend && (
                      <span className="inline-flex items-center gap-1 text-white/80">
                        <DollarSign className="size-3.5 shrink-0 text-[#00C98B]" />
                        {spend}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1.5">
                      <Globe className="size-3.5 shrink-0 text-white/35" />
                      {country}
                    </span>
                  </div>
                </div>

                {/* AI Brief */}
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  {/* Left accent */}
                  <div
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 top-0 w-px bg-gradient-to-b from-transparent via-[#00C98B]/60 to-transparent"
                  />

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-[#00C98B]/15 bg-[#00C98B]/10">
                      <BrainCircuit className="size-4 text-[#00C98B]" />
                    </div>

                    <p className="line-clamp-3 text-sm leading-relaxed text-white/65">
                      <span className="font-semibold text-white/90">
                        Job Brief:
                      </span>{" "}
                      {job.description?.trim() ||
                        "Freshly ingested from Upwork — match signals are being scored in real-time."}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="relative flex items-center justify-between overflow-hidden rounded-xl border border-[#00C98B]/15 bg-[#00C98B]/[0.07] p-3.5">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#00C98B]/10 via-transparent to-transparent"
                  />

                  <span className="relative inline-flex items-center gap-2 text-xs font-semibold text-[#00C98B]">
                    <Send className="size-3.5" />
                    Pushed to Telegram & Slack
                  </span>

                  <span className="relative text-[10px] font-bold uppercase tracking-[0.15em] text-[#00C98B]/80 motion-reduce:animate-none">
                    0.8s latency
                  </span>
                </div>
              </div>
            </article>
          </div>
        );
      })}
    </div>
  );
}
