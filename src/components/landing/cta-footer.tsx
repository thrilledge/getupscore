"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export function CtaFooter() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

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
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-t border-[#0A0A0A]/10"
    >
      {/* CTA Banner */}
      <div className="relative overflow-hidden bg-[#F7FFFC] py-20 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(circle at center, rgba(0,201,139,0.18) 0%, transparent 70%)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 top-0 size-[350px] rounded-full bg-[#00C98B]/10 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-0 size-[350px] rounded-full bg-[#00C98B]/10 blur-[120px]"
        />

        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8 lg:px-12">
          <div
            style={{ transitionDelay: isVisible ? "100ms" : "0ms" }}
            className={`flex flex-col items-center gap-5 transition-all duration-700 ease-out ${isVisible ? "translate-y-0 opacity-100 blur-0" : "translate-y-12 opacity-0 blur-[4px]"}`}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-[#00C98B]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#00C98B]">
              <span className="size-2 animate-ping rounded-full bg-[#00C98B] motion-reduce:animate-none" />
              OVER 4,200 FREELANCERS ONBOARDED
            </div>

            <h2 className="max-w-2xl font-heading text-4xl font-bold leading-[1.1] tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl">
              Your next high-paying project is posted right now
            </h2>

            <p className="max-w-xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
              Join leading independent engineers and agencies who bid before
              the competition even notices the post.
            </p>

            <div className="flex flex-col items-center gap-4 pt-2 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-[#00C98B] px-7 py-3.5 text-sm font-bold text-[#0A0A0A] shadow-[0_0_32px_rgba(0,201,139,0.4)] transition-all hover:bg-[#00C98B]/90 hover:shadow-[0_0_40px_rgba(0,201,139,0.5)]"
              >
                Get started free
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm font-bold text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A]"
              >
                I already have an account
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 pt-10 border-t border-[#fff]/20 text-xs font-bold uppercase tracking-wide text-[#0A0A0A]/55">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 stroke-[3] text-[#62CA8C]" />
                AI scoring included
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 stroke-[3] text-[#62CA8C]" />
                Setup in 60 seconds
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 stroke-[3] text-[#62CA8C]" />
                Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative overflow-hidden border-t border-white/10 bg-[#0A0A0A]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-[560px] -translate-x-1/2 rounded-full bg-[#00C98B]/10 blur-[100px]"
        />

        <div
          style={{ transitionDelay: isVisible ? "250ms" : "0ms" }}
          className={`relative mx-auto max-w-7xl px-5 py-14 transition-all duration-700 ease-out sm:px-8 lg:px-12 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
        >
          <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(4,1fr)] lg:gap-8">
            {/* Brand */}
            <div className="pr-4">
              <Link href="/" className="inline-block rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00C98B]">
                <img
                  src="/upscore-logo.png"
                  alt="UpScore"
                  width={60}
                  height={48}
                  className="h-[70px] w-auto object-contain"
                />
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-6 text-white/45">
                AI-powered Upwork opportunity finder — job alerts, opportunity
                scoring, and AI proposal drafts.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">
                Product
              </h3>
              <ul className="mt-4 space-y-3">
                {[
                  { label: "Features", href: "#features" },
                  { label: "How It Works", href: "#how-it-works" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "Live Feed", href: "#live-jobs" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-white/55 transition-colors hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tools */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">
                Tools
              </h3>
              <ul className="mt-4 space-y-3">
                {[
                  { label: "AI Proposal Studio", href: "#" },
                  { label: "Market Benchmarks", href: "#" },
                  { label: "Custom Webhooks", href: "#" },
                  { label: "Chrome Extension", href: "#" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-white/55 transition-colors hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">
                Resources
              </h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="#faq" className="text-sm text-white/55 transition-colors hover:text-white">
                    FAQ
                  </Link>
                </li>
                <li>
                  <a href="mailto:hello@getupscore.com" className="text-sm text-white/55 transition-colors hover:text-white">
                    Help &amp; Support
                  </a>
                </li>
                <li>
                  <a href="mailto:hello@getupscore.com" className="text-sm text-white/55 transition-colors hover:text-white">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">
                Legal
              </h3>
              <ul className="mt-4 space-y-3">
                <li className="text-sm text-white/40">Terms of Service</li>
                <li className="text-sm text-white/40">Privacy Policy</li>
                <li className="text-sm text-white/40">Security Architecture</li>
                <li className="text-sm text-white/40">Status Telemetry</li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs leading-5 text-white/45 sm:flex-row">
            <span>© 2026 UpScore. AI-powered Upwork opportunity finder. Built for contractors.</span>
            <span>Upwork® is a registered trademark of Upwork Inc.</span>
          </div>
        </div>
      </footer>
    </section>
  );
}