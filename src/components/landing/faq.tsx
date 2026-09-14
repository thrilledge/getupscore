"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Is the Free plan really free forever?",
    a: "Yes. The Free plan gives you access to recent jobs, standard opportunity scores, and our basic extension without asking for credit card information.",
  },
  {
    q: "How fast are the job alerts dispatched?",
    a: "Within 60 to 180 seconds of a client hitting publish on Upwork. Our distributed worker network crawls feeds around the clock with zero lag.",
  },
  {
    q: "Does UpScore require my Upwork login credentials?",
    a: "Never. We will never ask for your password or direct account credentials. Our ingestion engine monitors public feed APIs and RSS infrastructure.",
  },
  {
    q: "Which notification destinations are supported?",
    a: "You can push leads straight to Telegram, Slack, custom HTTPS webhooks, WhatsApp, Gmail, Make, n8n, and Zapier.",
  },
  {
    q: "How does the 0-100 UpScore metric work?",
    a: "Our model evaluates the client's past hire percentage, average rate paid, feedback score, job description specificity, and current proposal count.",
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
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="faq"
      className="relative scroll-mt-24 overflow-hidden bg-white py-20 sm:py-24 lg:py-28"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-44 top-20 size-[380px] rounded-full bg-[#00C98B]/10 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-44 bottom-10 size-[380px] rounded-full bg-[#00C98B]/10 blur-[120px]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: "linear-gradient(rgba(0,201,139,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.05) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage: "radial-gradient(ellipse 75% 70% at 50% 50%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 50% 50%, black, transparent)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-5 sm:px-8 lg:px-12">
        <div
          style={{ transitionDelay: isVisible ? "100ms" : "0ms" }}
          className={`mx-auto max-w-2xl text-center transition-all duration-700 ease-out ${isVisible ? "translate-y-0 opacity-100 blur-0" : "translate-y-10 opacity-0 blur-[4px]"}`}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0A0A0A]/70">
            <span className="relative flex size-2">
              {isVisible && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-40 motion-reduce:animate-none" />
              )}
              <span className="relative inline-flex size-2 rounded-full bg-[#00C98B]" />
            </span>
            Everything Clarified
          </div>

          <h2 className="font-heading text-4xl font-bold tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl">
            Frequently asked{" "}
            <span className="text-[#00C98B]">questions</span>
          </h2>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          {faqs.map((faq, index) => (
            <details
              key={faq.q}
              className="group overflow-hidden rounded-xl bg-white p-5 shadow-md transition-all duration-300 open:shadow-lg sm:p-6 border"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[#0A0A0A] outline-none sm:text-base [&::-webkit-details-marker]:hidden">
                <span>{faq.q}</span>
                <ChevronDown className="size-5 shrink-0 text-[#0A0A0A]/45 transition-transform duration-300 group-open:rotate-180 group-open:text-[#00C98B]" />
              </summary>

              <p className="mt-3 text-sm leading-6 text-[#0A0A0A]/55">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}