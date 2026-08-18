"use client";

import { useEffect, useRef, useState } from "react";

const faqs = [
  {
    q: "Is the Free plan really free?",
    a: "Yes — no credit card, no trial countdown. You get the dashboard, the Chrome extension, and AI scoring on recent jobs at no cost, forever.",
  },
  {
    q: "How fast are the job alerts?",
    a: "Upwork is scanned every few minutes around the clock. When a job matches your filters, an alert fires within minutes of the post appearing.",
  },
  {
    q: "Does the extension store my Upwork password?",
    a: "No. The extension uses your existing Upwork login session in the browser and never asks for or stores your password. It only needs permission to read the page you're already signed into.",
  },
  {
    q: "Which notification channels are supported?",
    a: "Email, Slack, Discord, and Telegram. You pick where you want alerts and how often.",
  },
  {
    q: "Can I use it on multiple devices?",
    a: "Yes. Your filters, saved jobs, and settings are tied to your account, so they follow you everywhere.",
  },
  {
    q: "How does AI scoring work?",
    a: "Each job is analyzed against your filters and profile: skill match, budget fit, competition level, and client quality. The result is a single score that tells you where to spend your connects.",
  },
];

export function FAQ() {
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
      id="faq"
      className="relative scroll-mt-24 overflow-hidden bg-white py-20 sm:py-24"
    >
      <style>
        {`
          @keyframes faqAnswerOpen {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          details[open] .faq-answer {
            animation: faqAnswerOpen 350ms
              cubic-bezier(0.16, 1, 0.3, 1);
          }

          @media (prefers-reduced-motion: reduce) {
            details[open] .faq-answer {
              animation: none;
            }
          }
        `}
      </style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-44 top-20 size-[380px] rounded-full bg-[#00C98B]/10 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-44 bottom-10 size-[380px] rounded-full bg-[#00C98B]/10 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,201,139,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.05) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage:
            "radial-gradient(ellipse 75% 70% at 50% 50%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 70% at 50% 50%, black, transparent)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        <div
          style={{
            transitionDelay: isVisible ? "100ms" : "0ms",
          }}
          className={`mx-auto max-w-2xl text-center transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
            ? "translate-y-0 opacity-100 blur-0"
            : "translate-y-10 opacity-0 blur-[4px]"
            }`}
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#0A0A0A]/70">
            <span className="relative flex size-2">
              {isVisible && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-40 motion-reduce:animate-none" />
              )}

              <span className="relative inline-flex size-2 rounded-full bg-[#00C98B]" />
            </span>

            FAQ
          </div>

          <h2 className="font-heading text-4xl font-bold tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl">
            Frequently asked{" "}
            <span className="text-[#00C98B]">questions</span>
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#0A0A0A]/60 sm:text-base">
            Everything you need to know before getting started with UpScore.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={faq.q}
              style={{
                transitionDelay: isVisible
                  ? `${240 + index * 90}ms`
                  : "0ms",
              }}
              className={`transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
                ? "translate-y-0 opacity-100 blur-0"
                : "translate-y-10 opacity-0 blur-[3px]"
                }`}
            >
              <details className="group overflow-hidden rounded-2xl border border-[#0A0A0A]/10 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow,background-color] duration-300 open:border-[#00C98B]/50 open:bg-[#00C98B]/5 open:shadow-[0_14px_38px_rgba(0,201,139,0.1)] hover:border-[#00C98B]/35 hover:shadow-[0_12px_35px_rgba(0,0,0,0.07)]">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-[#0A0A0A] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00C98B] group-open:text-[#00A975] sm:px-6 sm:text-base [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-3">
                    <span className="hidden text-xs font-bold tabular-nums text-[#00C98B] sm:inline">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    {faq.q}
                  </span>

                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#0A0A0A]/10 bg-[#0A0A0A]/5 text-[#0A0A0A]/60 transition-all duration-300 group-hover:border-[#00C98B]/30 group-hover:bg-[#00C98B]/10 group-hover:text-[#00A975] group-open:rotate-45 group-open:border-[#00C98B] group-open:bg-[#00C98B] group-open:text-[#0A0A0A]">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>

                <div className="faq-answer px-5 pb-5 sm:px-6 sm:pb-6">
                  <div className="border-t border-[#0A0A0A]/10 pt-4 sm:pl-9">
                    <p className="text-sm leading-6 text-[#0A0A0A]/60">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}