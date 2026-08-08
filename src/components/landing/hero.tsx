import Link from "next/link";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient mesh */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-pattern [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary-glow blur-3xl" />
      <div className="pointer-events-none absolute -top-20 left-[15%] -z-10 size-72 rounded-full bg-accent-blue/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-10 right-[15%] -z-10 size-72 rounded-full bg-accent-purple/20 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          <Sparkles className="size-3.5 text-accent-purple" />
          AI-scored, real-time job alerts for freelancers
        </div>

        <h1 className="mx-auto max-w-3xl font-heading text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          Never miss the{" "}
          <span className="bg-gradient-to-r from-accent-blue via-accent-purple to-accent-green bg-clip-text text-transparent">
            right Upwork job
          </span>{" "}
          again
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          {env.APP_NAME} scans Upwork every few minutes, scores every opportunity with AI,
          and alerts you the moment a job matches your skills — so you can reply while
          the competition is still reading.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            render={<Link href="/signup" />}
            size="lg"
            className="h-11 px-6 text-base"
          >
            Start finding jobs free
            <ArrowRight className="size-4" />
          </Button>
          <Button
            render={<Link href="#jobs" />}
            variant="outline"
            size="lg"
            className="h-11 px-6 text-base"
          >
            See live jobs
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-accent-green" />
            Free to start
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-4 text-accent-blue" />
            AI analysis included
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-accent-amber" />
            No credit card required
          </span>
        </div>
      </div>
    </section>
  );
}
