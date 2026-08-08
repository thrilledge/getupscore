import Link from "next/link";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase } from "lucide-react";

export function CtaFooter() {
  return (
    <section className="relative overflow-hidden border-t border-border/40">
      {/* Gradient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-pattern [mask-image:radial-gradient(ellipse_60%_60%_at_50%_100%,black,transparent)]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -z-10 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-primary-glow blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <h2 className="mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight sm:text-5xl">
            Your next big project is posted{" "}
            <span className="bg-gradient-to-r from-accent-blue via-accent-purple to-accent-green bg-clip-text text-transparent">
              right now
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join {env.APP_NAME} free and get a head start on every opportunity that matches your skills.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              render={<Link href="/signup" />}
              size="lg"
              className="h-11 px-6 text-base"
            >
              Get started free
              <ArrowRight className="size-4" />
            </Button>
            <Button
              render={<Link href="/login" />}
              variant="outline"
              size="lg"
              className="h-11 px-6 text-base"
            >
              I already have an account
            </Button>
          </div>
        </div>
      </div>

      <footer className="border-t border-border/40 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
              <Briefcase className="size-4" />
            </span>
            <span className="font-heading font-bold">{env.APP_NAME}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {env.APP_NAME}. AI-powered Upwork opportunity finder.
          </p>
        </div>
      </footer>
    </section>
  );
}
