import Link from "next/link";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-y border-[#0A0A0A]/10 bg-[#F7FFFC] py-12 sm:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-10 size-[360px] rounded-full bg-[#00C98B]/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 bottom-10 size-[360px] rounded-full bg-[#00C98B]/10 blur-[120px]"
      />

      <div className="relative mx-auto max-w-3xl px-5 sm:px-8 lg:px-12">
        <div className="mb-8 flex items-center gap-2 text-xs font-semibold text-[#00A975]">
          <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-[#00C98B]">
            <span aria-hidden="true">←</span>
            Back to UpScore
          </Link>
        </div>

        <div className="rounded-2xl border border-[#0A0A0A]/10 bg-white p-6 shadow-[0_8px_28px_rgba(0,0,0,0.04)] sm:p-10">
          <div className="border-b border-[#0A0A0A]/10 pb-6">
            <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] text-[#0A0A0A] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-xs font-medium text-[#0A0A0A]/45">
              Last updated: {updated}
            </p>
          </div>

          <div className="prose-sm mt-6 space-y-6 text-sm leading-7 text-[#0A0A0A]/70">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}