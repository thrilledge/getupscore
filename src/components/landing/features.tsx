"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BellRing,
  Gauge,
  PenLine,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react";

function IconTile({
  children,
  accent = "primary",
}: {
  children: React.ReactNode;
  accent?: "primary" | "deep";
}) {
  return (
    <span
      className={`grid size-10 place-items-center rounded-lg ${accent === "primary"
        ? "bg-[#00C98B]/10 text-[#00C98B]"
        : "bg-[#00A975]/10 text-[#00A975]"
        }`}
    >
      {children}
    </span>
  );
}

export function Features() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

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
        threshold: 0.12,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative scroll-mt-24 overflow-hidden bg-white py-20 sm:py-24 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-48 top-40 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 bottom-20 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,201,139,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.05) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)",
        }}
      />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div
          style={{
            transitionDelay: isVisible ? "100ms" : "0ms",
          }}
          className={`mx-auto max-w-3xl text-center transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
            ? "translate-y-0 opacity-100 blur-0"
            : "translate-y-10 opacity-0 blur-[4px]"
            }`}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0A0A0A]/70">
            <span className="relative flex size-2">
              {isVisible && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-40 motion-reduce:animate-none" />
              )}

              <span className="relative inline-flex size-2 rounded-full bg-[#00C98B]" />
            </span>

            Algorithmic Edge
          </div>

          <h2 className="font-heading text-4xl font-bold leading-[1.1] tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl">
            Everything you need to <br />{" "}
            <span className="text-[#00C98B]">win more work</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
            From initial job post indexing to your signed contract — one
            unified system engineered to turn Upwork into an automated client
            acquisition engine.
          </p>
        </div>

        <div
          style={{
            transitionDelay: isVisible ? "150ms" : "0ms",
          }}
          className={`mt-12 grid grid-cols-1 gap-6 transition-all duration-700 ease-out md:grid-cols-2 lg:mt-16 lg:grid-cols-3 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
            ? "translate-y-0 opacity-100 blur-0"
            : "translate-y-10 opacity-0 blur-[4px]"
            }`}
        >
          {/* Featured Wide Card */}
          <div className="group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl bg-[#0A0A0A] p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.16)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_rgba(0,201,139,0.18)] md:col-span-2 lg:col-span-2">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[#00C98B]/15 blur-3xl transition-colors duration-500 group-hover:bg-[#00C98B]/20"
            />

            <div className="relative z-10 flex flex-col gap-3">
              <IconTile>
                <BellRing className="size-5" />
              </IconTile>

              <h3 className="font-heading text-xl font-bold tracking-[-0.02em]">
                Smart Job Alerts
              </h3>

              <p className="max-w-xl text-sm leading-6 text-white/60">
                Zero-latency webhooks. While other freelancers wait for
                Upwork&apos;s delayed daily digest or hit manual refresh, our
                distributed scrapers ping your channels in under 90 seconds
                from job publication.
              </p>
            </div>

            <div className="relative z-10 mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#00C98B]/20 text-[#00C98B]">
                  <Zap className="size-4" />
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    Zero Latency Push
                  </p>
                  <p className="text-xs text-white/45">
                    Telegram &amp; Slack hooks
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#00A975]/20 text-[#00A975]">
                  <ShieldCheck className="size-4" />
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    Anti-Scam Filter
                  </p>
                  <p className="text-xs text-white/45">
                    Drops $5 budget spam
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Proposals */}
          <div className="group flex flex-col justify-between rounded-2xl border border-[#0A0A0A]/10 bg-[#F7FFFC] p-6 shadow-[0_14px_40px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#00C98B]/40 hover:shadow-[0_24px_60px_rgba(0,201,139,0.12)]">
            <div className="flex flex-col gap-3">
              <IconTile accent="deep">
                <PenLine className="size-5" />
              </IconTile>

              <h3 className="font-heading text-lg font-bold tracking-[-0.02em] text-[#0A0A0A]">
                AI Proposals
              </h3>

              <p className="text-sm leading-6 text-[#0A0A0A]/55">
                Generate surgical 3-paragraph opening hooks referencing specific
                nuances from the client&apos;s brief and past hiring tendencies.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-[#0A0A0A]/10 bg-white p-3 text-sm italic text-[#0A0A0A]/55">
              “I noticed your Supabase schema migration needs...”
            </div>
          </div>

          {/* Opportunity Score */}
          <div className="group flex flex-col justify-between rounded-2xl border border-[#0A0A0A]/10 bg-[#F7FFFC] p-6 shadow-[0_14px_40px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#00C98B]/40 hover:shadow-[0_24px_60px_rgba(0,201,139,0.12)]">
            <div className="flex flex-col gap-3">
              <IconTile>
                <Gauge className="size-5" />
              </IconTile>

              <h3 className="font-heading text-lg font-bold tracking-[-0.02em] text-[#0A0A0A]">
                Opportunity Score
              </h3>

              <p className="text-sm leading-6 text-[#0A0A0A]/55">
                Proprietary 0-100 rating analyzing client payment history,
                average hourly wage paid, hire conversion rate, and prompt
                clarity.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wide text-[#0A0A0A]/45">
                Algorithm Model
              </span>
              <span className="font-bold text-[#00A975]">v2.4 Bayesian</span>
            </div>
          </div>

          {/* Market Intel */}
          <div className="group flex flex-col justify-between rounded-2xl border border-[#0A0A0A]/10 bg-[#F7FFFC] p-6 shadow-[0_14px_40px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#00C98B]/40 hover:shadow-[0_24px_60px_rgba(0,201,139,0.12)]">
            <div className="flex flex-col gap-3">
              <IconTile accent="deep">
                <BarChart3 className="size-5" />
              </IconTile>

              <h3 className="font-heading text-lg font-bold tracking-[-0.02em] text-[#0A0A0A]">
                Market Intel
              </h3>

              <p className="text-sm leading-6 text-[#0A0A0A]/55">
                Track hourly rate benchmarks across your niche and gauge how
                aggressively other freelancers bid on similar contracts.
              </p>
            </div>

            <div className="mt-5 flex h-2 w-full overflow-hidden rounded-full bg-[#0A0A0A]/10">
              <span className="h-full w-2/3 bg-[#00C98B]" />
              <span className="h-full w-1/4 bg-[#00A975]" />
            </div>
          </div>

          {/* High-Spend Filtering */}
          <div className="group flex flex-col justify-between rounded-2xl border border-[#0A0A0A]/10 bg-[#F7FFFC] p-6 shadow-[0_14px_40px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#00C98B]/40 hover:shadow-[0_24px_60px_rgba(0,201,139,0.12)]">
            <div className="flex flex-col gap-3">
              <IconTile>
                <SlidersHorizontal className="size-5" />
              </IconTile>

              <h3 className="font-heading text-lg font-bold tracking-[-0.02em] text-[#0A0A0A]">
                High-Spend Filtering
              </h3>

              <p className="text-sm leading-6 text-[#0A0A0A]/55">
                Ignore accounts that spend $15/hr or haven&apos;t verified
                billing. Focus strictly on clients with $10k+ historical spend.
              </p>
            </div>

            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#00A975]">
              <ShieldCheck className="size-4" />
              Zero Unverified Ingestion
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}