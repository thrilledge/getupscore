"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BellRing,
  BrainCircuit,
  Check,
  FileText,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";

type Feature = {
  label: string;
  icon: (typeof BellRing);
  title: string;
  description: string;
  points: { title: string; description: string }[];
  Demo: () => React.JSX.Element;
};

function AlertsDemo() {
  const rows = [
    { title: "React Frontend Engineer", rate: "$55–85/hr", time: "1m ago", tag: "Expert" },
    { title: "Figma → React landing page", rate: "$1.2k fixed", time: "3m ago", tag: "Fixed" },
    { title: "Next.js SaaS MVP", rate: "$8k–12k", time: "6m ago", tag: "Expert" },
  ];

  return (
    <div className="w-full max-w-sm space-y-3">
      {rows.map((row, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
        >
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-50 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2.5 rounded-full bg-[#00C98B]" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{row.title}</p>
            <p className="text-xs text-zinc-400">{row.time}</p>
          </div>

          <div className="text-right">
            <p className="text-xs font-bold text-[#00C98B]">{row.rate}</p>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{row.tag}</p>
          </div>
        </div>
      ))}

      <button className="w-full rounded-xl bg-[#00C98B] py-2.5 text-sm font-bold text-[#0A0A0A]">
        Match found — apply first
      </button>
    </div>
  );
}

function ProposalDemo() {
  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00C98B]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#00C98B]">
          <Sparkles className="size-3" aria-hidden="true" />
          Tailored to this job
        </span>

        <span className="text-[11px] text-zinc-500">persona · Upwork Expert</span>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-sm font-semibold text-white">
          Hi, I&apos;ve shipped 3 production React apps…
        </p>

        <div className="mt-3 space-y-2">
          <div className="h-2 w-full rounded-full bg-white/10" />
          <div className="h-2 w-4/5 rounded-full bg-white/10" />
          <div className="h-2 w-3/5 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 rounded-xl bg-[#00C98B] py-2.5 text-sm font-bold text-[#0A0A0A]">
          Send proposal
        </button>

        <button className="rounded-xl border border-white/10 px-3 py-2.5 text-sm font-semibold text-white">
          Regenerate
        </button>
      </div>
    </div>
  );
}

function ScoringDemo() {
  const rows = [
    { title: "Senior Shopify Developer", score: 96, color: "#00C98B" },
    { title: "Next.js SaaS MVP", score: 74, color: "#FBBF24" },
    { title: "PHP WordPress tweaks", score: 31, color: "#F87171" },
  ];

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <div
          className="relative size-16 shrink-0 rounded-full"
          style={{
            background:
              "conic-gradient(#00C98B 0% 96%, rgba(255,255,255,0.08) 96% 100%)",
          }}
        >
          <div className="absolute inset-[5px] grid place-items-center rounded-full bg-zinc-900">
            <div className="text-center">
              <p className="text-lg font-bold leading-none text-white">96</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-500">match</p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-white">Opportunity score</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#00C98B]">
            <TrendingUp className="size-3" aria-hidden="true" />
            High win probability
          </p>
          <p className="mt-1 text-xs text-zinc-400">Client verified · 12 proposals</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.title} className="flex items-center gap-3">
            <p className="w-40 truncate text-xs text-zinc-300">{row.title}</p>

            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${row.score}%`, backgroundColor: row.color }}
              />
            </div>

            <p className="w-8 text-right text-xs font-bold" style={{ color: row.color }}>
              {row.score}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketDemo() {
  const bars = [34, 42, 38, 55, 48, 70, 64, 92];
  const skills = [
    { name: "React", share: 88 },
    { name: "Next.js", share: 71 },
    { name: "AI / ML", share: 64 },
    { name: "Shopify", share: 47 },
  ];

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white">Demand trend · last 30 days</p>
        <span className="rounded-full bg-[#00C98B]/15 px-2 py-0.5 text-[10px] font-bold text-[#00C98B]">
          +42%
        </span>
      </div>

      <div className="mt-3 flex h-24 items-end gap-1.5">
        {bars.map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-md bg-gradient-to-t from-[#00C98B]/25 to-[#00C98B]"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      <div className="mt-5 space-y-2.5">
        {skills.map((skill) => (
          <div key={skill.name} className="flex items-center gap-3">
            <p className="w-20 text-xs text-zinc-300">{skill.name}</p>

            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#00C98B]"
                style={{ width: `${skill.share}%` }}
              />
            </div>

            <p className="w-10 text-xs font-semibold text-[#00C98B]">{skill.share}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FiltersDemo() {
  const chips = ["$50–150/hr", "Expert", "Payment verified", "React", "< 5 proposals"];
  const results = [
    { title: "Senior React Engineer — US", budget: "$120/hr", match: "96" },
    { title: "Next.js landing pages", budget: "$2.4k fixed", match: "91" },
  ];

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-[#00C98B]/30 bg-[#00C98B]/10 px-2.5 py-1 text-[11px] font-semibold text-[#00C98B]"
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
        <p className="text-sm font-bold text-white">312 matching jobs</p>
        <span className="text-xs text-zinc-400">scanned 9,204</span>
      </div>

      <div className="mt-3 space-y-2">
        {results.map((result) => (
          <div
            key={result.title}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{result.title}</p>
              <p className="mt-0.5 text-xs text-zinc-400">{result.budget}</p>
            </div>

            <span className="rounded-full bg-[#00C98B]/15 px-2 py-0.5 text-[11px] font-bold text-[#00C98B]">
              {result.match}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerifiedDemo() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#00C98B] to-[#00A975] text-sm font-bold text-[#0A0A0A]">
          JP
        </div>

        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-white">
            Jane Partners
            <ShieldCheck className="size-4 shrink-0 text-[#00C98B]" aria-hidden="true" />
          </p>
          <p className="text-xs text-zinc-400">Payment method verified</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className="size-3.5 fill-[#FBBF24] text-[#FBBF24]"
            aria-hidden="true"
          />
        ))}

        <span className="ml-1.5 text-xs text-zinc-400">4.9 · 148 reviews</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
        <div>
          <p className="text-sm font-bold text-white">$180k+</p>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">spent</p>
        </div>

        <div>
          <p className="text-sm font-bold text-white">42</p>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">hires</p>
        </div>

        <div>
          <p className="text-sm font-bold text-white">100%</p>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">hire rate</p>
        </div>
      </div>
    </div>
  );
}

const features: Feature[] = [
  {
    label: "Job alerts",
    icon: BellRing,
    title: "Smart job alerts",
    description:
      "Be first to the high-paying jobs with real-time, fully customizable alerts — delivered the second they drop.",
    points: [
      {
        title: "Instant notifications",
        description:
          "Get notified the moment a job matches your skills, budget, and niche — respond before the crowd.",
      },
      {
        title: "Advanced filters",
        description:
          "Filter out noise with criteria like skills, budget, job type, client history, and payment verification.",
      },
      {
        title: "Everywhere you work",
        description:
          "Receive alerts via email, Slack, Telegram, Discord, or webhook so you never miss a lead on the go.",
      },
      {
        title: "Verified-first",
        description:
          "Client history and payment-verified badges surface up front, so you bid with confidence.",
      },
    ],
    Demo: AlertsDemo,
  },
  {
    label: "AI proposals",
    icon: FileText,
    title: "AI proposal drafts",
    description:
      "Turn any job into a tailored, client-specific proposal in seconds — grounded in your real Upwork profile.",
    points: [
      {
        title: "Job-aware drafts",
        description:
          "Paste a job post and instantly get a proposal that matches the client's tone and requirements.",
      },
      {
        title: "Client-specific",
        description:
          "Proposals carry your experience, portfolio links, and unique selling points in a professional tone.",
      },
      {
        title: "Templates & variants",
        description:
          "Generate multiple variations and reusable templates to A/B test your winning style.",
      },
      {
        title: "Multi-platform",
        description:
          "One streamlined AI workflow for Upwork, Fiverr, LinkedIn, and direct clients.",
      },
    ],
    Demo: ProposalDemo,
  },
  {
    label: "Opportunity score",
    icon: BrainCircuit,
    title: "AI opportunity scoring",
    description:
      "Every job is scored on match fit, win probability, and client quality — so you spend connects where they count.",
    points: [
      {
        title: "Match fit",
        description:
          "See how well a job aligns with your skills, rates, and preferred scope in one glance.",
      },
      {
        title: "Win probability",
        description:
          "Proposal count and client hiring patterns turn into a realistic chance-of-winning estimate.",
      },
      {
        title: "Client quality",
        description:
          "Verified payments, spend history, and ratings are factored in before you invest connects.",
      },
      {
        title: "Score first, read later",
        description:
          "Sort your feed by score and let the winners rise to the top instead of scrolling forever.",
      },
    ],
    Demo: ScoringDemo,
  },
  {
    label: "Market intel",
    icon: BarChart3,
    title: "Market trends & analytics",
    description:
      "See what clients are hiring for right now — live skill demand, budget trends, and client geography.",
    points: [
      {
        title: "Spot hot categories early",
        description:
          "Know which skills get the most posts and highest budgets before they get saturated.",
      },
      {
        title: "Price yourself right",
        description:
          "Track average rates and budgets in your niche so you never undercharge or price yourself out.",
      },
      {
        title: "Know what clients want",
        description:
          "See which client types hire most actively and which skills they're asking for.",
      },
      {
        title: "Stay ahead",
        description:
          "Surface emerging demand weeks before other freelancers catch the trend.",
      },
    ],
    Demo: MarketDemo,
  },
  {
    label: "Precise filters",
    icon: Zap,
    title: "Precise filters & matching",
    description:
      "Keyword, budget, tier, and skill filters backed by a smart matching engine. Stop scrolling thousands of irrelevant posts.",
    points: [
      {
        title: "Keyword & skill matching",
        description: "Match on the exact keywords and skills that win jobs, not fuzzy title guesses.",
      },
      {
        title: "Budget & rate bounds",
        description: "Only surface jobs inside your target range — both fixed budget and hourly rate.",
      },
      {
        title: "Tier & type control",
        description: "Pin entry, intermediate, or expert work; fixed or hourly; full-time or as-needed.",
      },
      {
        title: "Proposal count caps",
        description:
          "Skip already-crowded posts before you spend connects on a 200-bid race.",
      },
    ],
    Demo: FiltersDemo,
  },
  {
    label: "Verified clients",
    icon: ShieldCheck,
    title: "Verified clients first",
    description:
      "Payment-verified badges and client history surface up front — know who you're bidding against before you write.",
    points: [
      {
        title: "Payment verified",
        description:
          "Only show jobs from clients with a verified payment method so you always get paid.",
      },
      {
        title: "Hiring track record",
        description: "Spend, hire count, and hire rate reveal serious clients versus tire kickers.",
      },
      {
        title: "Rating context",
        description: "Freelancer ratings of the client warn you before a risky engagement.",
      },
      {
        title: "No ghost posts",
        description: "Active contracts and job liveness checks keep stale listings out of your feed.",
      },
    ],
    Demo: VerifiedDemo,
  },
];

function DemoShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-[24px] border border-white/10 bg-zinc-900 shadow-[0_24px_70px_rgba(0,201,139,0.16)] md:h-[420px]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00C98B]/70 to-transparent"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 size-64 rounded-full bg-[#00C98B]/20 blur-[90px]"
      />

      <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-3.5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">{label}</p>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00C98B]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#00C98B]">
          <span className="size-1.5 animate-pulse rounded-full bg-[#00C98B] motion-reduce:animate-none" />
          Live
        </span>
      </div>

      <div className="relative flex h-[calc(100%-49px)] items-center justify-center p-5">
        {children}
      </div>
    </div>
  );
}

export function Features() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

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

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (paused || prefersReduced) return;

    const id = setInterval(() => {
      setActive((current) => (current + 1) % features.length);
    }, 6000);

    return () => clearInterval(id);
  }, [paused]);

  const feature = features[active];

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative scroll-mt-24 overflow-hidden bg-white py-20 sm:py-24 lg:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
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

          <h2 className="font-heading text-4xl font-bold tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl leading-[1.1]">
            Everything you need <br /> to{" "}
            <span className="text-[#00C98B]">win more work</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
            From discovery to signed contract — one workspace that
            turns Upwork into a lead engine.
          </p>
        </div>

        <div
          style={{
            transitionDelay: isVisible ? "150ms" : "0ms",
          }}
          className={`transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
            ? "translate-y-0 opacity-100 blur-0"
            : "translate-y-10 opacity-0 blur-[4px]"
            }`}
        >
          <div
            role="tablist"
            aria-label="Feature tabs"
            className="-mx-6 mt-12 flex gap-2 overflow-x-auto px-6 pb-2 md:mx-0 md:flex-wrap md:justify-center md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mt-14"
          >
            {features.map((item, index) => (
              <button
                key={item.label}
                role="tab"
                aria-selected={index === active}
                onClick={() => setActive(index)}
                className={`group inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00C98B] ${index === active
                  ? "border-[#00C98B]/40 bg-[#00C98B]/10 text-[#0A0A0A]"
                  : "border-[#0A0A0A]/10 bg-white text-[#0A0A0A]/55 hover:border-[#00C98B]/30 hover:text-[#0A0A0A] dark:hover:text-white"
                  }`}
              >
                <item.icon
                  className="size-4 shrink-0 text-[#00C98B]"
                  aria-hidden="true"
                />
                {item.label}
              </button>
            ))}
          </div>

          <div
            key={active}
            className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-2 lg:gap-16 motion-reduce:[animation:none]"
            style={{ animation: "feature-fade-up 0.45s ease-out" }}
          >
            <div>
              <h3 className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#0A0A0A] sm:text-3xl">
                {feature.title}
              </h3>

              <p className="mt-3 text-base leading-7 text-[#0A0A0A]/60">
                {feature.description}
              </p>

              <ul className="mt-7 space-y-4">
                {feature.points.map((point) => (
                  <li key={point.title} className="flex gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#00C98B]/15 text-[#00C98B]">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>

                    <div>
                      <p className="font-heading text-sm font-bold text-[#0A0A0A]">
                        {point.title}
                      </p>
                      <p className="mt-0.5 text-sm leading-6 text-[#0A0A0A]/55">
                        {point.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <DemoShell label={feature.label}>
              <feature.Demo />
            </DemoShell>
          </div>
        </div>
      </div>
    </section>
  );
}