import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export interface RelatedTool {
  title: string;
  description: string;
  href: string;
}

export function ToolShell({
  title,
  eyebrow,
  description,
  children,
  related,
}: {
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
  related: RelatedTool[];
}) {
  return (
    <div className="min-h-screen bg-[#F7FFFC]">
      {/* Light header banner */}
      <section className="relative overflow-hidden bg-[#EFF1F3] text-[#0A0A0A] dark:bg-[#0A0A0A] dark:text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#00C98B]/15 blur-[110px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/4 size-72 rounded-full bg-[#00C98B]/10 blur-[110px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 70% 80% at 50% 0%, black, transparent)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 80% at 50% 0%, black, transparent)",
          }}
        />

        <div className="relative mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-18 lg:px-10">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A0A0A]/60 transition-colors hover:text-[#00C98B] dark:text-white/60"
          >
            <ArrowLeft className="size-3.5" />
            All free tools
          </Link>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#00C98B]/30 bg-[#00C98B]/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#00C98B]">
            {eyebrow}
          </div>

          <h1 className="mt-4 max-w-3xl font-heading text-3xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-4xl lg:text-5xl">
            {title}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#0A0A0A]/60 sm:text-base dark:text-white/60">
            {description}
          </p>
        </div>
      </section>

      {/* Tool body */}
      <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        {children}
      </main>

      {/* Related tools */}
      <section className="border-t border-[#0A0A0A]/10 bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 lg:px-10">
          <h2 className="font-heading text-xl font-bold tracking-tight text-[#0A0A0A] sm:text-2xl">
            More free tools
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group rounded-2xl border border-[#0A0A0A]/10 bg-[#F7FFFC] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/40 hover:shadow-[0_14px_36px_rgba(0,201,139,0.10)]"
              >
                <h3 className="font-heading text-sm font-bold text-[#0A0A0A]">
                  {tool.title}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-[#0A0A0A]/55">
                  {tool.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#00A975] transition-all group-hover:gap-2 group-hover:text-[#00C98B]">
                  Open tool
                  <ArrowRight className="size-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}