const faqs = [
  {
    q: "Is the Free plan really free?",
    a: "Yes — no credit card, no trial countdown. You get the dashboard, the Chrome extension, and AI scoring on recent jobs at no cost, forever.",
  },
  {
    q: "How fast are the job alerts?",
    a: "Upwork is scanned every few minutes around the clock. When a job matches your filters, an alert fires within minutes of the post appearing.",
  },
  {
    q: "Does the extension store my Upwork password?",
    a: "No. The extension uses your existing Upwork login session in the browser and never asks for or stores your password. It only needs permission to read the page you're already signed into.",
  },
  {
    q: "Which notification channels are supported?",
    a: "Email, Slack, Discord, and Telegram. You pick where you want alerts and how often.",
  },
  {
    q: "Can I use it on multiple devices?",
    a: "Yes. Your filters, saved jobs, and settings are tied to your account, so they follow you everywhere.",
  },
  {
    q: "How does AI scoring work?",
    a: "Each job is analyzed against your filters and profile: skill match, budget fit, competition level, and client quality. The result is a single score that tells you where to spend your connects.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-24 py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-purple">
            FAQ
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-border/50 bg-card px-5 py-4 transition-colors open:border-border"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="text-muted-foreground transition-transform group-open:rotate-45">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
