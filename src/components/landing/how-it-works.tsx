"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCheck } from "lucide-react";

type Chip = { icon?: boolean; text: string; color: string };

type Step = {
  num: string;
  title: string;
  desc: string;
  chip: Chip[];
};

const steps: Step[] = [
  {
    num: "01",
    title: "Tell us what you do",
    desc: "Pick your technical stack, minimum required hourly rate, verified payment preferences, and negative keywords in 60 seconds.",
    chip: [{ text: "Next.js • $85+/hr • Payment Verified", color: "text-[#0A0A0A]/60" }],
  },
  {
    num: "02",
    title: "We scan & score",
    desc: "Our continuous ingestion engine ingests jobs every minute, scoring them based on client spend, hiring probability, and competition density.",
    chip: [
      { text: "Score: 94 / 100", color: "text-[#00C98B]" },
      { text: "< 5 competitors", color: "text-[#00C98B]" },
    ],
  },
  {
    num: "03",
    title: "You win the work",
    desc: "Receive the alert on Telegram or Slack. Tap the notification, review the extracted pain points, and send your winning proposal first.",
    chip: [{ icon: true, text: "Sent 3m before competition", color: "text-[#00A975]" }],
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
      { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
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
      <div aria-hidden="true" className="pointer-events-none absolute -left-48 top-24 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-48 bottom-10 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: "linear-gradient(rgba(0,201,139,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.05) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)",
        }}
      />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div
          style={{ transitionDelay: isVisible ? "100ms" : "0ms" }}
          className={`mx-auto max-w-3xl text-center transition-all duration-700 ease-out ${isVisible ? "translate-y-0 opacity-100 blur-0" : "translate-y-10 opacity-0 blur-[4px]"}`}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0A0A0A]/70">
            <span className="relative flex size-2">
              {isVisible && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-40 motion-reduce:animate-none" />
              )}
              <span className="relative inline-flex size-2 rounded-full bg-[#00C98B]" />
            </span>
            Fast Lane Workflow
          </div>

          <h2 className="font-heading text-4xl font-bold tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl leading-[1.2]">
            From job post to contract <br className="hidden sm:block" /> in{" "}
            <span className="text-[#00C98B]">three steps</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
            Stop scrolling endless pages of low-budget spam. Let <br /> our crawler
            score the market in seconds.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3 lg:mt-16">
          {steps.map((step, index) => (
            <div
              key={step.num}
              style={{ transitionDelay: isVisible ? `${200 + index * 120}ms` : "0ms" }}
              className={`group flex flex-col gap-4 rounded-2xl border border-[#0A0A0A]/10 bg-white p-6 shadow-[0_14px_40px_rgba(0,0,0,0.05)] transition-all duration-700 ease-out hover:-translate-y-1.5 hover:border-[#00C98B]/40 hover:shadow-[0_22px_55px_rgba(0,201,139,0.13)] ${isVisible ? "translate-y-0 opacity-100 blur-0" : "translate-y-12 opacity-0 blur-[4px]"}`}
            >
              <div className="text-6xl font-bold leading-none text-[#00C98B]/20 transition-colors duration-300 group-hover:text-[#00C98B]/30">
                {step.num}
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-heading text-lg font-bold tracking-[-0.02em] text-[#0A0A0A]">
                  {step.title}
                </h3>

                <p className="text-sm leading-6 text-[#0A0A0A]/55">
                  {step.desc}
                </p>
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-3 rounded-lg bg-[#F7FFFC] p-3 border border-[#0A0A0A]/10">
                {step.chip.map((c, ci) => (
                  <span
                    key={ci}
                    className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${c.color}`}
                  >
                    {c.icon && <CheckCheck className="size-4" />}
                    {c.text}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}