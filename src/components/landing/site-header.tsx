import Link from "next/link";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
            <Briefcase className="size-4.5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">
            {env.APP_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#jobs" className="transition-colors hover:text-foreground">
            Live Jobs
          </a>
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </a>
          <a href="#faq" className="transition-colors hover:text-foreground">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button render={<Link href="/login" />} variant="ghost" size="sm">
            Sign in
          </Button>
          <Button render={<Link href="/signup" />} size="sm">
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}
