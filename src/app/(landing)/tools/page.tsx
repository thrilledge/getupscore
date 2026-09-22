import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Calculator,
  Repeat,
  TextCursorInput,
  Target,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Free Tools for Freelancers",
  description:
    "Free, no-signup tools for Upwork and freelance professionals — rate calculators, fee calculators, salary converters, and more.",
};

const tools = [
  {
    href: "/tools/rate-calculator",
    icon: Calculator,
    title: "Rate Calculator",
    description:
      "See your real take-home pay after Upwork fees and business costs — and what your hourly rate is actually worth.",
    tag: "Earnings",
  },
  {
    href: "/tools/fee-calculator",
    icon: BadgeDollarSign,
    title: "Upwork Fee Calculator",
    description:
      "Work out exactly what lands in your pocket from a fixed-price or hourly contract after Upwork's service fee.",
    tag: "Take-home",
  },
  {
    href: "/tools/salary-converter",
    icon: Repeat,
    title: "Hourly ⇄ Salary Converter",
    description:
      "Convert an hourly rate to an annual salary or back — tuned to your real billable hours per year.",
    tag: "Benchmark",
  },
  {
    href: "/tools/proposal-counter",
    icon: TextCursorInput,
    title: "Proposal Character Counter",
    description:
      "Live character and word count for your Upwork cover letter, with the 5,000-character limit and a reading-time estimate.",
    tag: "Proposals",
  },
  {
    href: "/tools/budget-planner",
    icon: Target,
    title: "Freelance Rate Planner",
    description:
      "Work backwards from your desired income, costs and savings to the hourly rate you need to charge.",
    tag: "Pricing",
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#F7FFFC]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0A0A0A] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-28 size-96 rounded-full bg-[#00C98B]/15 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 left-1/3 size-80 rounded-full bg-[#00C98B]/10 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 70% 85% at 50% 0%, black, transparent)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 85% at 50% 0%, black, transparent)",
          }}
        />

        <div className="relative mx-auto max-w-[1200px] px-5 py-18 sm:px-8 lg:px-10 lg:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00C98B]/30 bg-[#00C98B]/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#00C98B]">
            Free Tools
          </div>

          <h1 className="mt-5 max-w-3xl font-heading text-4xl font-bold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            Free tools for{" "}
            <span className="text-[#00C98B]">freelancers.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            Unlock better rates, bigger proposals and fatter take-home pay —
            with simple calculators that run right in your browser. No sign-up,
            no dashboard.
          </p>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-white/50">
            {["100% free", "No account needed", "Works in your browser"].map(
              (item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#00C98B]" />
                  {item}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Tools grid */}
      <main className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 lg:px-10 lg:py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-[#0A0A0A]/10 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.045)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#00C98B]/40 hover:shadow-[0_22px_55px_rgba(0,201,139,0.14)]"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-[#00C98B]/10 blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-[#0A0A0A] text-[#00C98B] transition-all duration-300 group-hover:scale-105">
                      <Icon className="size-5" />
                    </span>

                    <span className="rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#008F64]">
                      {tool.tag}
                    </span>
                  </div>

                  <h2 className="mt-5 font-heading text-lg font-bold tracking-tight text-[#0A0A0A]">
                    {tool.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#0A0A0A]/55">
                    {tool.description}
                  </p>
                </div>

                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[#00A975] transition-all duration-300 group-hover:gap-2.5 group-hover:text-[#00C98B]">
                  Open tool
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col items-center justify-between gap-5 overflow-hidden rounded-3xl bg-[#0A0A0A] px-6 py-8 text-white sm:flex-row sm:px-10">
          <div className="min-w-0">
            <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
              Tools are just the start.
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-white/55">
              UpScore watches Upwork for you — instant alerts, AI scoring and
              proposal drafts on the jobs that match your skills.
            </p>
          </div>

          <Link
            href="/signup"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#00C98B] px-5 text-sm font-bold text-[#0A0A0A] transition-all hover:-translate-y-0.5 hover:bg-[#00C98B]/90"
          >
            Get started free
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}