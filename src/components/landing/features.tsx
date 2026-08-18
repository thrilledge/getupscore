"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BrainCircuit,
  BellRing,
  FileText,
  BarChart3,
  Zap,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: BrainCircuit,
    title: "AI opportunity scoring",
    desc: "Every job is scored on match fit, win probability, and client quality — so you spend connects on opportunities that actually count.",
    color: "text-[#00C98B]",
    bg: "bg-[#00C98B]/10",
    span: "lg:col-span-2",
  },
  {
    icon: BellRing,
    title: "Instant alerts",
    desc: "Email, Slack, Discord, or Telegram the second a matching job drops. Be first in line, not fifth.",
    color: "text-[#00C98B]",
    bg: "bg-[#00C98B]/10",
    span: "lg:col-span-1",
  },
  {
    icon: FileText,
    title: "AI proposal drafts",
    desc: "Turn any job into a tailored, client-specific proposal draft in seconds — grounded in your real Upwork profile.",
    color: "text-[#00C98B]",
    bg: "bg-[#00C98B]/10",
    span: "lg:col-span-1",
  },
  {
    icon: BarChart3,
    title: "Market intelligence",
    desc: "Live skill demand, budget trends, and client geography so you can position your profile where the money is.",
    color: "text-[#00C98B]",
    bg: "bg-[#00C98B]/10",
    span: "lg:col-span-2",
  },
  {
    icon: Zap,
    title: "Precise filters",
    desc: "Keyword, budget, tier, and skill filters with a smart matching engine. Stop scrolling thousands of irrelevant posts.",
    color: "text-[#00C98B]",
    bg: "bg-[#00C98B]/10",
    span: "lg:col-span-2",
  },
  {
    icon: ShieldCheck,
    title: "Verified clients",
    desc: "Payment-verified badges and client history surfaced up front — know who you're bidding against before you write.",
    color: "text-[#00C98B]",
    bg: "bg-[#00C98B]/10",
    span: "lg:col-span-1",
  },
];

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

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
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

            Features
          </div>

          <h2 className="font-heading text-4xl font-bold tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl">
            Everything you need to{" "}
            <span className="text-[#00C98B]">win more work</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
            From discovery to signed contract — {`${"one"}`} workspace that
            turns Upwork into a lead engine.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:auto-rows-[260px]">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              style={{
                transitionDelay: isVisible
                  ? `${250 + index * 100}ms`
                  : "0ms",
              }}
              className={`${feature.span} transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
                  ? "translate-y-0 opacity-100 blur-0"
                  : "translate-y-12 opacity-0 blur-[4px]"
                }`}
            >
              <Card className="group relative h-full overflow-hidden rounded-[24px] border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_14px_45px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-2 hover:border-[#00C98B]/45 hover:shadow-[0_24px_60px_rgba(0,201,139,0.13)] motion-reduce:transform-none motion-reduce:transition-none">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[#00C98B]/0 blur-3xl transition-colors duration-500 group-hover:bg-[#00C98B]/10"
                />

                <div
                  aria-hidden="true"
                  className="absolute right-6 top-5 font-heading text-5xl font-bold text-[#0A0A0A]/5 transition-colors duration-300 group-hover:text-[#00C98B]/10"
                >
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-[#00C98B] transition-transform duration-500 group-hover:scale-x-100" />

                <CardContent className="relative flex h-full flex-col justify-between p-6 sm:p-7">
                  <span
                    className={`flex size-12 items-center justify-center rounded-2xl border border-[#00C98B]/15 ${feature.bg} ${feature.color} transition-all duration-300 group-hover:rotate-3 group-hover:scale-110 group-hover:bg-[#00C98B] group-hover:text-[#0A0A0A]`}
                  >
                    <feature.icon className="size-6" />
                  </span>

                  <div className="mt-8">
                    <h3 className="font-heading text-xl font-bold tracking-[-0.02em] text-[#0A0A0A] transition-colors duration-300 group-hover:text-[#00A975]">
                      {feature.title}
                    </h3>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#0A0A0A]/55 sm:text-[15px]">
                      {feature.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}