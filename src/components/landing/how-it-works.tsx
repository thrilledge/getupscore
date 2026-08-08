import { Search, Sparkles, Handshake } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Tell us what you do",
    desc: "Pick your skills, budgets, and preferred client types in a few clicks. No complicated setup.",
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
  },
  {
    icon: Sparkles,
    title: "We scan & score",
    desc: "Upwork is crawled every few minutes. Every new job is scored by AI for fit, competition, and client quality.",
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
  },
  {
    icon: Handshake,
    title: "You win the work",
    desc: "Get alerted instantly, review the analysis, and send a tailored proposal — often before anyone else even sees the post.",
    color: "text-accent-green",
    bg: "bg-accent-green/10",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-y border-border/40 bg-muted/20 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-green">
            How it works
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            From job post to contract in three steps
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative">
              {i < steps.length - 1 && (
                <div className="absolute left-full top-8 hidden h-px w-6 bg-border md:block" />
              )}
              <div className="flex flex-col items-start gap-3">
                <span className="flex items-center gap-3">
                  <span
                    className={`flex size-11 items-center justify-center rounded-2xl ${s.bg} ${s.color}`}
                  >
                    <s.icon className="size-5" />
                  </span>
                  <span className="font-heading text-sm font-bold text-muted-foreground">
                    Step {i + 1}
                  </span>
                </span>
                <h3 className="font-heading text-lg font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
