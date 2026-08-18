"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Sparkles, Handshake } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Tell us what you do",
    desc: "Pick your skills, budgets, and preferred client types in a few clicks. No complicated setup.",
    color: "text-[#00C98B]",
    bg: "bg-[#00C98B]/10",
  },
  {
    icon: Sparkles,
    title: "We scan & score",
    desc: "Upwork is crawled every few minutes. Every new job is scored by AI for fit, competition, and client quality.",
    color: "text-[#00C98B]",
    bg: "bg-[#00C98B]/10",
  },
  {
    icon: Handshake,
    title: "You win the work",
    desc: "Get alerted instantly, review the analysis, and send a tailored proposal — often before anyone else even sees the post.",
    color: "text-[#00C98B]",
    bg: "bg-[#00C98B]/10",
  },
];

export function HowItWorks() {
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
        threshold: 0.18,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative scroll-mt-24 overflow-hidden border-y border-[#0A0A0A]/10 bg-[#F7FFFC] py-20 sm:py-24 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-48 top-24 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 bottom-10 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]"
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

            How it works
          </div>

          <h2 className="font-heading text-4xl font-bold tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl">
            From job post to contract in{" "}
            <span className="text-[#00C98B]">three steps</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
            Set your preferences once, let AI find the right opportunities,
            and focus your energy on winning the work.
          </p>
        </div>

        <div className="relative mt-14 lg:mt-16">
          <div className="absolute left-[16.66%] right-[16.66%] top-8 hidden h-px overflow-hidden bg-[#0A0A0A]/10 md:block">
            <div
              style={{
                transitionDelay: isVisible ? "450ms" : "0ms",
              }}
              className={`h-full origin-left bg-[#00C98B] transition-transform duration-1000 ease-out motion-reduce:scale-x-100 motion-reduce:transition-none ${isVisible ? "scale-x-100" : "scale-x-0"
                }`}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3 lg:gap-6">
            {steps.map((step, index) => (
              <div
                key={step.title}
                style={{
                  transitionDelay: isVisible
                    ? `${280 + index * 160}ms`
                    : "0ms",
                }}
                className={`relative z-10 transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
                    ? "translate-y-0 opacity-100 blur-0"
                    : "translate-y-12 opacity-0 blur-[4px]"
                  }`}
              >
                <div className="group relative h-full overflow-hidden rounded-[24px] border border-[#0A0A0A]/10 bg-white p-6 text-center shadow-[0_14px_45px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-2 hover:border-[#00C98B]/45 hover:shadow-[0_24px_60px_rgba(0,201,139,0.13)] sm:p-8 motion-reduce:transform-none motion-reduce:transition-none">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-20 -top-20 size-52 rounded-full bg-[#00C98B]/0 blur-3xl transition-colors duration-500 group-hover:bg-[#00C98B]/10"
                  />

                  <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-[#00C98B] transition-transform duration-500 group-hover:scale-x-100" />

                  <div
                    aria-hidden="true"
                    className="absolute right-5 top-4 font-heading text-5xl font-bold text-[#0A0A0A]/5 transition-colors duration-300 group-hover:text-[#00C98B]/10"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <span
                    className={`relative mx-auto flex size-16 items-center justify-center rounded-2xl border border-[#00C98B]/20 ${step.bg} ${step.color} shadow-[0_10px_25px_rgba(0,201,139,0.1)] transition-all duration-300 group-hover:rotate-3 group-hover:scale-110 group-hover:bg-[#00C98B] group-hover:text-[#0A0A0A]`}
                  >
                    <step.icon className="size-7" />
                  </span>

                  <div className="relative mt-6">
                    <span className="inline-flex rounded-full bg-[#0A0A0A]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0A0A0A]/50 transition-colors duration-300 group-hover:bg-[#00C98B]/10 group-hover:text-[#00A975]">
                      Step {index + 1}
                    </span>

                    <h3 className="mt-4 font-heading text-xl font-bold tracking-[-0.02em] text-[#0A0A0A] transition-colors duration-300 group-hover:text-[#00A975]">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-[#0A0A0A]/55 sm:text-[15px]">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}