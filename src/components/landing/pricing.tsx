"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { parse } from "node:path";

type BillingPeriod = "monthly" | "yearly";

const freeFeatures = [
  "Up to 10 filtered jobs per refresh",
  "AI scoring on top 3 recent jobs",
  "Access to Live Web Dashboard",
  "Standard Chrome Extension widget",
];

const proFeatures = [
  "Unlimited continuous real-time jobs feed",
  "Instant Telegram & Slack Webhook alerts",
  "Unlimited tailored AI Proposals & client hooks",
  "Market trends & competitor bid distribution",
  "Unlimited negative keywords & budget filters",
];

const proPrices: Record<BillingPeriod, { amount: string; sub: string }> = {
  monthly: { amount: "$12", sub: "/ month billed monthly" },
  yearly: { amount: "$10.83", sub: "/ month billed yearly" },
};

// get save ammount if purchased yearly

let getNumber = (priceStr: string) => parseFloat(priceStr.replace(/[^0-9.]/g, ''));

const monthlyPrice = getNumber(proPrices.monthly.amount);
const yearlyPrice = getNumber(proPrices.yearly.amount);



let savedAmount = (monthlyPrice * 12) - (yearlyPrice * 12)


export function Pricing() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

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
      id="pricing"
      className="relative scroll-mt-24 overflow-hidden border-y border-[#0A0A0A]/10 bg-[#F7FFFC] py-20 sm:py-24 lg:py-28"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-20 size-[360px] rounded-full bg-[#00C98B]/10 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 bottom-10 size-[360px] rounded-full bg-[#00C98B]/10 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
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
            Transparent Investment
          </div>

          <h2 className="font-heading text-4xl font-bold tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl leading-[1.1]">
            Start free. Upgrade <br className="hidden sm:block" /> when{" "}
            <span className="text-[#00C98B]">you&apos;re winning.</span>
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
            Simple pricing designed to pay for itself on your very first won
            proposal.
          </p>

          {/* Billing toggle */}
          <div className="mt-6 inline-flex items-center rounded-xl bg-white p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${period === "monthly"
                ? "bg-[#0A0A0A]/10 text-[#0A0A0A]"
                : "text-[#0A0A0A]/50 hover:text-[#0A0A0A]"
                }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setPeriod("yearly")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${period === "yearly"
                ? "bg-[#0A0A0A]/10 text-[#0A0A0A]"
                : "text-[#0A0A0A]/50 hover:text-[#0A0A0A]"
                }`}
            >
              Yearly
              <span className="rounded bg-[#00C98B]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#00A975]">
                SAVE 10%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl items-stretch gap-6 md:grid-cols-2">
          {/* Free plan */}
          <div
            style={{ transitionDelay: isVisible ? "250ms" : "0ms" }}
            className={`flex flex-col justify-between rounded-2xl border border-[#0A0A0A]/10 bg-white p-6 shadow-xl transition-all duration-700 ease-out sm:p-8 ${isVisible ? "translate-y-0 opacity-100 blur-0" : "translate-y-12 opacity-0 blur-[4px]"}`}
          >
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="font-heading text-lg font-bold text-[#0A0A0A]">
                  Free
                </h3>
                <p className="mt-1 text-sm text-[#0A0A0A]/55">
                  For freelancers just getting started with smarter discovery
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="font-heading text-4xl font-bold text-[#0A0A0A]">
                  $0
                </span>
                <span className="text-sm text-[#0A0A0A]/50">forever</span>
              </div>

              <div className="flex flex-col gap-2.5 border-t border-[#0A0A0A]/10 pt-5">
                {freeFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-[#0A0A0A]/75">
                    <Check className="size-4 shrink-0 text-[#00C98B]" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/signup"
              className="mt-8 inline-flex items-center justify-center rounded-xl border border-[#0A0A0A]/15 bg-[#0A0A0A]/5 px-5 py-3 text-sm font-bold text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A]/10"
            >
              Start free
            </Link>
          </div>

          {/* Pro plan */}
          <div
            style={{ transitionDelay: isVisible ? "350ms" : "0ms" }}
            className={`relative flex flex-col justify-between rounded-2xl bg-white p-6 shadow-2xl transition-all duration-700 ease-out sm:p-8 ${isVisible ? "translate-y-0 opacity-100 blur-0" : "translate-y-12 opacity-0 blur-[4px]"} shadow-[0_0_24px_rgba(0,201,139,0.3)] border border-[#00C98B]`}
          >

            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#0A0A0A]">
                    Pro
                  </h3>
                  <p className="mt-1 text-sm text-[#0A0A0A]/55">
                    For high-conviction agencies &amp; contractors
                  </p>
                </div>

                <span className="rounded-full bg-[#00C98B]/20 px-2.5 py-1 text-xs font-bold text-[#00A975]">
                  POPULAR
                </span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="font-heading text-4xl font-bold text-[#00C98B]">
                  {proPrices[period].amount}
                </span>
                <span className="text-sm text-[#0A0A0A]/50">
                  {proPrices[period].sub}
                </span>
              </div>

              <div className="flex flex-col gap-2.5 border-t border-[#0A0A0A]/10 pt-5">
                {proFeatures.map((f, i) => (
                  <div
                    key={f}
                    className={`flex items-center gap-2 text-sm ${i < 0 ? "font-medium text-[#0A0A0A]/85" : "text-[#0A0A0A]/75"}`}
                  >
                    <Check className="size-4 shrink-0 text-[#00C98B]" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/signup"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#00C98B] px-5 py-3 text-sm font-bold text-[#0A0A0A] shadow-[0_0_24px_rgba(0,201,139,0.3)] transition-all hover:bg-[#00C98B]/90 hover:shadow-[0_0_32px_rgba(0,201,139,0.4)]"
            >
              Upgrade to Pro
            </Link>


          </div>
        </div>

        <p className="mt-6 text-center text-xs font-medium text-[#0A0A0A]/45">
          UpScore Pro is billed via secure Stripe checkout —
          yearly billing saves ${savedAmount.toFixed(0)} compared to monthly payments.
        </p>
      </div>
    </section>
  );
}