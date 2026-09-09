"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";

type BillingPeriod = "monthly" | "yearly";

const PRO_FEATURES = [
  "Full jobs dashboard",
  "AI job analysis",
  "Unlimited proposals",
  "Market trends",
  "Extension API access",
  "Unlimited filters",
];

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
      {
        threshold: 0.18,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  const plans = [
    {
      name: "Free",
      price: "$0",
      periodLabel: "forever",
      subLabel: "",
      desc: "For freelancers just getting started with smarter discovery.",
      cta: "Start free",
      href: "/signup",
      highlight: false,
      features: [
        "Up to 10 filtered jobs per refresh",
        "AI scoring on recent jobs",
        "Real-time dashboard",
        "Chrome extension",
      ],
    },
    {
      name: "Pro",
      price: period === "monthly" ? "$12" : "$130",
      periodLabel: period === "monthly" ? "/ month" : "/ year",
      subLabel:
        period === "monthly"
          ? "Billed monthly"
          : "Billed yearly — save $14",
      desc: "For serious freelancers who treat Upwork like a business.",
      cta: "Upgrade to Pro",
      href: "/signup",
      highlight: true,
      features: PRO_FEATURES,
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="relative scroll-mt-24 overflow-hidden border-y border-[#0A0A0A]/10 bg-[#F7FFFC] py-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-20 size-[360px] rounded-full bg-[#00C98B]/10 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 bottom-10 size-[360px] rounded-full bg-[#00C98B]/10 blur-[120px]"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
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
            <span className="size-2 rounded-full bg-[#00C98B]" />
            Pricing
          </div>

          <h2 className="font-heading text-4xl font-bold tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl leading-[1.2]">
            Start free. Upgrade <br /> when{" "}
            <span className="inline-block tracking-normal text-[#00C98B]">
              you&apos;re winning.
            </span>
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#0A0A0A]/60 sm:text-base">
            Start free in minutes. Upgrade only when it pays for itself — and
            cancel anytime.
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div
          style={{
            transitionDelay: isVisible ? "200ms" : "0ms",
          }}
          className={`mt-8 flex justify-center transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
            ? "translate-y-0 opacity-100 blur-0"
            : "translate-y-8 opacity-0 blur-[3px]"
            }`}
        >
          <div className="inline-flex items-center rounded-full border border-[#0A0A0A]/10 bg-white p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              aria-pressed={period === "monthly"}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-all sm:px-6 ${period === "monthly"
                ? "bg-[#0A0A0A] text-white shadow-sm"
                : "text-[#0A0A0A]/55 hover:text-[#0A0A0A]"
                }`}
            >
              Monthly
            </button>

            <button
              type="button"
              onClick={() => setPeriod("yearly")}
              aria-pressed={period === "yearly"}
              className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold transition-all sm:px-6 ${period === "yearly"
                ? "bg-[#0A0A0A] text-white shadow-sm"
                : "text-[#0A0A0A]/55 hover:text-[#0A0A0A]"
                }`}
            >
              Yearly
              <span className="rounded-full bg-[#00C98B]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00A975]">
                Save 10%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl items-stretch gap-6 md:grid-cols-2">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              style={{
                transitionDelay: isVisible
                  ? `${280 + index * 160}ms`
                  : "0ms",
              }}
              className={`transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
                ? "translate-y-0 opacity-100 blur-0"
                : "translate-y-12 opacity-0 blur-[4px]"
                }`}
            >
              <Card
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white py-0 transition-all duration-300 hover:-translate-y-1 motion-reduce:transform-none ${plan.highlight
                  ? "border border-[#00C98B]/55 shadow-[0_18px_50px_rgba(0,201,139,0.12)] hover:shadow-[0_22px_55px_rgba(0,201,139,0.18)]"
                  : "border border-[#0A0A0A]/10 shadow-[0_14px_40px_rgba(0,0,0,0.06)] hover:border-[#00C98B]/35 hover:shadow-[0_20px_50px_rgba(0,0,0,0.09)]"
                  }`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 ${plan.highlight
                    ? "bg-[#00C98B]"
                    : "origin-left scale-x-0 bg-[#00C98B] transition-transform duration-500 group-hover:scale-x-100"
                    }`}
                />

                {plan.highlight && (
                  <>
                    <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-[#00C98B]/12 blur-[75px]" />

                    <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-[#00C98B] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0A0A0A]">
                      <Sparkles className="size-3" />
                      Most popular
                    </span>
                  </>
                )}

                <CardHeader className="relative p-6 pb-4">
                  <CardTitle className="font-heading text-lg font-bold text-[#0A0A0A]">
                    {plan.name}
                  </CardTitle>

                  <div className="mt-3 flex flex-wrap items-baseline gap-1.5">
                    <span className="font-heading text-4xl font-bold tracking-tight text-[#0A0A0A]">
                      {plan.price}
                    </span>

                    {plan.periodLabel && (
                      <span className="text-sm text-[#0A0A0A]/45">
                        {plan.periodLabel}
                      </span>
                    )}
                  </div>

                  {plan.subLabel && (
                    <p className="mt-1.5 text-xs font-semibold text-[#00A975]">
                      {plan.subLabel}
                    </p>
                  )}

                  <p className="mt-2 max-w-sm text-sm leading-5 text-[#0A0A0A]/55">
                    {plan.desc}
                  </p>
                </CardHeader>

                <CardContent className="relative flex-1 px-6 py-2">
                  <div className="mb-4 h-px bg-[#0A0A0A]/10" />

                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm text-[#0A0A0A]/75"
                      >
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#00C98B]/10">
                          <Check className="size-3.5 stroke-[2.5] text-[#00C98B]" />
                        </span>

                        <span className="leading-5">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="relative mt-auto p-6 pt-5">
                  <Button
                    render={<Link href={plan.href} />}
                    variant={plan.highlight ? "default" : "outline"}
                    className={`h-11 w-full rounded-full text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 ${plan.highlight
                      ? "border-0 bg-[#00C98B] text-[#0A0A0A] shadow-[0_10px_25px_rgba(0,201,139,0.18)] hover:bg-[#00C98B]/90"
                      : "border-[#0A0A0A] bg-[#0A0A0A] text-white hover:bg-[#0A0A0A]/90 hover:text-white"
                      }`}
                  >
                    {plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs font-medium text-[#0A0A0A]/45">
          Prices in USD. {env.APP_NAME} Pro is billed via secure checkout —
          yearly billing saves $14 compared to paying monthly.
        </p>
      </div>
    </section>
  );
}