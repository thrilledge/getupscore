import Link from "next/link";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
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
    price: "Coming soon",
    period: "",
    desc: "For serious freelancers who treat Upwork like a business.",
    cta: "Join the waitlist",
    href: "/signup",
    highlight: true,
    features: [
      "Unlimited jobs & filters",
      "Instant alerts on every channel",
      "AI proposal drafts",
      "Advanced market intelligence",
      "Priority AI analysis",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 border-y border-border/40 bg-muted/20 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-blue">
            Pricing
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Start free. Upgrade when you&apos;re winning.
          </h2>
          <p className="mt-3 text-muted-foreground">
            No credit card, no lock-in. {env.APP_NAME} pays for itself the first time you land a job faster.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative border-border/50 ${
                plan.highlight
                  ? "md:-mt-3 md:-mb-3 ring-1 ring-accent-blue/40 shadow-lg shadow-accent-blue/5"
                  : ""
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-accent-blue px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <Sparkles className="size-3" />
                  Most popular
                </span>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-heading text-4xl font-bold tracking-tight">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">/ {plan.period}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent-green" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  render={<Link href={plan.href} />}
                  variant={plan.highlight ? "default" : "outline"}
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
