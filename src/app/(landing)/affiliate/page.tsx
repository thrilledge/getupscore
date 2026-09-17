import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gift, Percent, Users, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Affiliate Program",
  description:
    "Earn 20% recurring commission on every Pro referral with the UpScore Affiliate Program.",
};

const benefits = [
  {
    icon: Percent,
    title: "20% recurring commission",
    description:
      "Earn 20% on every Pro subscription your referrals buy — every month, for as long as they stay subscribed.",
  },
  {
    icon: Users,
    title: "Referrals convert naturally",
    description:
      "Freelancers you already help are ready to try a tool that wins them work. Share your link and earn.",
  },
  {
    icon: Wallet,
    title: "Low payout threshold",
    description:
      "Request payouts whenever your pending balance hits the minimum. Cash out easily via bank transfer.",
  },
  {
    icon: Gift,
    title: "Personal dashboard",
    description:
      "Track clicks, signups, conversions, and earnings in real time from your affiliate dashboard.",
  },
];

const steps = [
  {
    number: 1,
    title: "Create your free account",
    description: "Sign up, then enable the affiliate program from your dashboard.",
  },
  {
    number: 2,
    title: "Grab your unique link",
    description: "Your personal referral link is generated instantly — paste it anywhere.",
  },
  {
    number: 3,
    title: "Share it",
    description: "Post it in your bio, newsletter, community, or send it directly to freelancers.",
  },
  {
    number: 4,
    title: "Earn monthly",
    description: "Get 20% recurring commission every month a referral stays on Pro.",
  },
];

export default function AffiliatePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#0A0A0A]/10 bg-[#F7FFFC] py-16 sm:py-20 lg:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 top-10 size-[360px] rounded-full bg-[#00C98B]/10 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 bottom-10 size-[360px] rounded-full bg-[#00C98B]/10 blur-[120px]"
        />

        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8 lg:px-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0A0A0A]/70">
            <span className="size-2 rounded-full bg-[#00C98B] shadow-[0_0_8px_rgba(0,201,139,0.8)]" />
            UpScore Affiliate Program
          </div>

          <h1 className="font-heading text-4xl font-bold tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl leading-[1.1]">
            Earn <span className="text-[#00C98B]">20% recurring</span>{" "}
            on every Pro referral
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
            Help freelancers win more work with UpScore&apos;s AI-powered
            job discovery — and earn passive commission every month they
            stay subscribed.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00C98B] px-7 py-3.5 text-sm font-bold text-[#0A0A0A] shadow-[0_0_32px_rgba(0,201,139,0.4)] transition-all hover:bg-[#00C98B]/90"
            >
              Start earning now
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm font-bold text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A]"
            >
              Already have an account? Join from your dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="group rounded-2xl border border-[#0A0A0A]/10 bg-white p-6 shadow-[0_6px_22px_rgba(0,0,0,0.035)] transition-all duration-300 hover:-translate-y-1 hover:border-[#00C98B]/40 hover:shadow-[0_14px_34px_rgba(0,201,139,0.1)]"
                >
                  <span className="mb-4 grid size-11 place-items-center rounded-xl bg-[#00C98B]/10 text-[#00A975] transition-colors group-hover:bg-[#00C98B] group-hover:text-[#0A0A0A]">
                    <Icon className="size-5" />
                  </span>
                  <h2 className="font-heading text-base font-bold text-[#0A0A0A]">
                    {benefit.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#0A0A0A]/55">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-[#0A0A0A]/10 bg-[#F7FFFC] py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-[-0.03em] text-[#0A0A0A] sm:text-4xl">
              How it works
            </h2>
            <p className="mt-3 text-base leading-7 text-[#0A0A0A]/60">
              No friction, no minimums to start. Here&apos;s the whole
              process.
            </p>
          </div>

          <div className="mt-10 space-y-0">
            {steps.map((step, index) => (
              <div key={step.number} className="relative flex gap-4 sm:gap-6">
                {index < steps.length - 1 && (
                  <div className="absolute left-[22px] top-11 h-[calc(100%-2.5rem)] w-px bg-[#00C98B]/25 sm:left-[27px]" />
                )}
                <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-xl border border-[#00C98B]/30 bg-white font-heading text-sm font-bold text-[#00A975] shadow-sm sm:size-14 sm:text-base">
                  {step.number}
                </span>
                <div className="pb-8">
                  <h3 className="font-heading text-base font-bold text-[#0A0A0A] sm:text-lg">
                    {step.title}
                  </h3>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-[#0A0A0A]/55">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings example */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 lg:px-12">
          <div className="overflow-hidden rounded-2xl bg-[#0A0A0A] p-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.18)] sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[#00C98B]/15 blur-[100px]"
            />
            <div className="relative">
              <div className="flex items-center gap-2">
                <Percent className="size-4 text-[#00C98B]" />
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#00C98B]">
                  What 20% recurring looks like
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { label: "5 Pro referrals", value: "$12/mo", note: "≈ $12 every month" },
                  { label: "25 Pro referrals", value: "$60/mo", note: "≈ $720 a year" },
                  { label: "100 Pro referrals", value: "$240/mo", note: "≈ $2,880 a year" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="rounded-xl border border-white/10 bg-white/[0.045] p-4"
                  >
                    <p className="text-xs text-white/50">{row.label}</p>
                    <p className="mt-1 font-heading text-xl font-bold text-[#00C98B]">
                      {row.value}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/40">{row.note}</p>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-xs leading-5 text-white/45">
                * Illustrative figures based on the monthly Pro plan.
                Commissions are calculated on confirmed Pro sales (20%)
                and may be paid out after the minimum payout threshold
                is reached.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#0A0A0A]/10 bg-[#F7FFFC] py-16 text-center sm:py-20">
        <div className="mx-auto max-w-2xl px-5 sm:px-8">
          <h2 className="font-heading text-3xl font-bold tracking-[-0.03em] text-[#0A0A0A] sm:text-4xl">
            Ready to earn on autopilot?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-[#0A0A0A]/60">
            Your unique referral link is waiting. Share it, track it,
            and earn every month.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#00C98B] px-8 py-3.5 text-sm font-bold text-[#0A0A0A] shadow-[0_0_32px_rgba(0,201,139,0.4)] transition-all hover:bg-[#00C98B]/90"
          >
            Join the program
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}