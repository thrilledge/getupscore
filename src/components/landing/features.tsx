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
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
    span: "lg:col-span-2",
  },
  {
    icon: BellRing,
    title: "Instant alerts",
    desc: "Email, Slack, Discord, or Telegram the second a matching job drops. Be first in line, not fifth.",
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    span: "lg:col-span-1",
  },
  {
    icon: FileText,
    title: "AI proposal drafts",
    desc: "Turn any job into a tailored, client-specific proposal draft in seconds — grounded in your real Upwork profile.",
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
    span: "lg:col-span-1",
  },
  {
    icon: BarChart3,
    title: "Market intelligence",
    desc: "Live skill demand, budget trends, and client geography so you can position your profile where the money is.",
    color: "text-accent-amber",
    bg: "bg-accent-amber/10",
    span: "lg:col-span-2",
  },
  {
    icon: Zap,
    title: "Precise filters",
    desc: "Keyword, budget, tier, and skill filters with a smart matching engine. Stop scrolling thousands of irrelevant posts.",
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    span: "lg:col-span-1",
  },
  {
    icon: ShieldCheck,
    title: "Verified clients",
    desc: "Payment-verified badges and client history surfaced up front — know who you're bidding against before you write.",
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
    span: "lg:col-span-1",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-purple">
            Features
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to win more work
          </h2>
          <p className="mt-3 text-muted-foreground">
            From discovery to signed contract — {`${"one"}`} workspace that turns Upwork into a lead engine.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {features.map((f) => (
            <Card
              key={f.title}
              className={`${f.span} border-border/50 transition-all hover:border-border hover:shadow-sm`}
            >
              <CardContent className="flex flex-col gap-3 py-6">
                <span
                  className={`flex size-10 items-center justify-center rounded-xl ${f.bg} ${f.color}`}
                >
                  <f.icon className="size-5" />
                </span>
                <h3 className="font-heading text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
