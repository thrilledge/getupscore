import Link from "next/link";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import type { LiveJob } from "@/components/landing/live-jobs";
import { HeroJobStack } from "@/components/landing/hero-job-stack";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  CircleCheck,
  DollarSign,
  Globe,
  LockOpen,
  Radar,
  Send,
  Star,
  Zap,
} from "lucide-react";

export function Hero({ jobs = [] }: { jobs?: LiveJob[] }) {
  const hasJobs = jobs.length > 0;

  const score = hasJobs ? null : 94;
  const country = "United States";
  const rating = "5.0";
  const showRating = !hasJobs;
  const verified = !hasJobs;
  const range = "$95–$130";
  const rangeLabel = "Est. Hourly";
  const spend = "$140k+ Spent";
  const proposalsLine = "Client hires in <3 proposals";
  const ingested = "Ingested 12s ago";
  const title = "Senior Full Stack Next.js & AI Agent Engineer";
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-gradient-to-b from-[#F2FFFA] via-[#F8FFFC] to-white lg:min-h-[calc(100svh-72px)]">
      <style>
        {`
          @keyframes heroRise {
            from {
              opacity: 0;
              transform: translateY(38px);
              filter: blur(5px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
              filter: blur(0);
            }
          }

          @keyframes underlineReveal {
            from {
              opacity: 0;
              transform: scaleX(0);
            }

            to {
              opacity: 1;
              transform: scaleX(1);
            }
          }

          @keyframes orbLeft {
            0%, 100% {
              transform: translate3d(0, 0, 0);
            }

            50% {
              transform: translate3d(35px, 25px, 0);
            }
          }

          @keyframes orbRight {
            0%, 100% {
              transform: translate3d(0, 0, 0);
            }

            50% {
              transform: translate3d(-35px, 30px, 0);
            }
          }

          .hero-reveal {
            opacity: 0;
            animation: heroRise 850ms cubic-bezier(0.16, 1, 0.3, 1)
              forwards;
            will-change: opacity, transform;
          }

          .hero-delay-1 {
            animation-delay: 80ms;
          }

          .hero-delay-2 {
            animation-delay: 180ms;
          }

          .hero-delay-3 {
            animation-delay: 300ms;
          }

          .hero-delay-4 {
            animation-delay: 420ms;
          }

          .hero-delay-5 {
            animation-delay: 540ms;
          }

          .hero-underline {
            opacity: 0;
            transform-origin: left;
            animation: underlineReveal 700ms
              cubic-bezier(0.16, 1, 0.3, 1) 850ms forwards;
          }

          .hero-orb-left {
            animation: orbLeft 10s ease-in-out infinite;
          }

          .hero-orb-right {
            animation: orbRight 12s ease-in-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .hero-reveal,
            .hero-underline,
            .hero-orb-left,
            .hero-orb-right {
              opacity: 1;
              animation: none;
              transform: none;
              filter: none;
            }
          }
        `}
      </style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,201,139,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 75% 70% at 50% 35%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 70% at 50% 35%, black, transparent)",
        }}
      />

      <div
        aria-hidden="true"
        className="hero-orb-left pointer-events-none absolute -left-32 top-20 size-[420px] rounded-full bg-[#00C98B]/10 blur-[100px]"
      />

      <div
        aria-hidden="true"
        className="hero-orb-right pointer-events-none absolute -right-32 top-0 size-[440px] rounded-full bg-[#00C98B]/10 blur-[110px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 size-[500px] -translate-x-1/2 rounded-full bg-[#00C98B]/5 blur-[120px]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left Hero Pitch */}
          <div className="lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="hero-reveal hero-delay-1 mb-7 w-fit">
              <div className="group inline-flex cursor-default items-center gap-2 rounded-full border border-[#0A0A0A]/10 bg-white/75 px-4 py-2 text-xs font-semibold tracking-wide text-[#0A0A0A]/75 shadow-[0_8px_28px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#00C98B]/50 hover:shadow-[0_12px_32px_rgba(0,201,139,0.12)] sm:text-sm">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-[#00C98B]" />
                </span>

                AI-scored, real-time Upwork alerts
              </div>
            </div>

            <h1 className="hero-reveal hero-delay-2 max-w-4xl font-heading text-[44px] font-bold leading-[1.08] tracking-[-0.03em] text-[#0A0A0A] sm:text-6xl lg:text-[72px] xl:text-[80px]">
              Never miss the right{" "}
              <span className="bg-gradient-to-r from-[#00C98B] via-[#00C98B] to-[#00A975] bg-clip-text text-transparent">
                Upwork
              </span>{" "}
              job again
            </h1>

            <p className="hero-reveal hero-delay-3 mt-7 max-w-2xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg sm:leading-8">
              {env.APP_NAME} scans Upwork continuously, scores every lead with
              our algorithmic engine, and alerts you the second a job matches
              your exact stack — so you can submit high-conviction proposals
              before competition saturates the post.
            </p>

            <div className="hero-reveal hero-delay-4 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:items-start">
              <Button
                render={<Link href="/signup" />}
                size="lg"
                className="group h-13 w-full rounded-xl bg-[#00C98B] px-8 text-base font-bold text-[#0A0A0A] shadow-[0_0_32px_rgba(0,201,139,0.3)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#00C98B]/90 hover:shadow-[0_16px_40px_rgba(0,201,139,0.38)] sm:w-auto"
              >
                Start finding jobs free

                <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>

              <Button
                render={<Link href="#live-jobs" />}
                variant="outline"
                size="lg"
                className="h-13 w-full gap-2 rounded-xl border-[#0A0A0A]/15 bg-white/60 px-8 text-base font-bold text-[#0A0A0A] shadow-none backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#00C98B]/60 hover:bg-[#00C98B]/10 hover:text-[#0A0A0A] sm:w-auto"
              >
                <Radar className="size-5 text-[#00C98B]" />
                See live stream
              </Button>
            </div>

            <div className="hero-reveal hero-delay-5 mt-10 flex max-w-3xl flex-col items-center justify-center gap-4 text-sm font-medium text-[#0A0A0A]/60 sm:flex-row sm:gap-8 lg:items-start">
              <span className="group inline-flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#0A0A0A]">
                <BadgeCheck className="size-4 text-[#00C98B]" />
                Free forever tier
              </span>

              <span className="group inline-flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#0A0A0A]">
                <Zap className="size-4 text-[#00C98B]" />
                AI scoring included
              </span>

              <span className="group inline-flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#0A0A0A]">
                <LockOpen className="size-4 text-[#00C98B]" />
                Zero lock-in contract
              </span>
            </div>
          </div>

          {/* Right Visual Telemetry Glass Card */}
          <div className="hero-reveal hero-delay-3 lg:col-span-5">
            <div
              aria-hidden="true"
              className="absolute -inset-1 -z-10 rounded-[24px] bg-gradient-to-r from-[#00C98B]/30 to-[#00A975]/20 blur-xl opacity-60"
            />

            {hasJobs ? (
              <HeroJobStack jobs={jobs.slice(0, 5)} />
            ) : (
              <div className="relative flex flex-col gap-4 rounded-[24px] border border-[#0A0A0A]/10 bg-white p-6 shadow-2xl ">
                {/* Glass Top Header Bar */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00C98B]">
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-60 motion-reduce:animate-none" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-[#00C98B]" />
                    </span>
                    Live Match Event
                  </span>

                  <span className="rounded bg-[#0A0A0A]/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0A0A0A]/50">
                    {ingested}
                  </span>
                </div>

                {/* Radar Match Gauge */}
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
                          strokeDasharray="94, 100"
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
                        TOP 1% FIT SCORE
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
                      {rangeLabel}
                    </span>
                    <span className="text-lg font-bold text-[#00C98B]">
                      {range}
                    </span>
                  </div>
                </div>

                {/* Job Details Snippet */}
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-heading cursor-pointer text-base font-bold leading-snug text-[#0A0A0A] transition-colors hover:text-[#00A975]">
                    {title}
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

                    {showRating && (
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

                {/* AI Assessment Block */}
                <div className="flex items-start gap-2.5 rounded-lg border border-[#0A0A0A]/5 bg-[#0A0A0A]/5 p-3 text-sm leading-6 text-[#0A0A0A]/60">
                  <BrainCircuit className="mt-0.5 size-5 shrink-0 text-[#00A975]" />

                  <p>
                    <span className="font-semibold text-[#0A0A0A]">
                      AI Rationale:
                    </span>{" "}
                    Client has an active LangGraph workflow. Strong match for
                    your previous Next.js v15 + OpenAI SDK showcases. Very low
                    client price resistance.
                  </p>
                </div>

                {/* Dispatch Alert Pill */}
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
            )}
          </div>
        </div>
      </div>
    </section>
  );
}