"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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

      {/* Footer */}
      <footer className="relative overflow-hidden border-t border-[#0A0A0A]/10 bg-[#EFF1F3] dark:border-white/10 dark:bg-[#0A0A0A]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-[560px] -translate-x-1/2 rounded-full bg-[#00C98B]/10 blur-[100px]"
        />

        <div
          style={{ transitionDelay: isVisible ? "250ms" : "0ms" }}
          className={`relative mx-auto max-w-[1440px] px-5 py-14 transition-all duration-700 ease-out sm:px-8 lg:px-12 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
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
              <p className="mt-4 max-w-xs text-sm leading-6 text-[#0A0A0A]/45 dark:text-white/45">
                AI-powered Upwork opportunity finder — job alerts, opportunity
                scoring, and AI proposal drafts.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A0A0A]/40 dark:text-white/40">
                Product
              </h3>
              <ul className="mt-4 space-y-3">
                {[
                  { label: "Features", href: "/#features" },
                  { label: "How It Works", href: "/#how-it-works" },
                  { label: "Pricing", href: "/#pricing" },
                  { label: "Live Feed", href: "/#live-jobs" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A] dark:text-white/55 dark:hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tools */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A0A0A]/40 dark:text-white/40">
                Tools
              </h3>
              <ul className="mt-4 space-y-3">
                {[
                  { label: "All Free Tools", href: "/tools" },
                  { label: "Upwork Rate Calculator", href: "/tools/rate-calculator" },
                  { label: "Upwork Fee Calculator", href: "/tools/fee-calculator" },
                  { label: "Hourly to Salary Converter", href: "/tools/salary-converter" },
                  { label: "Freelance Rate Planner", href: "/tools/budget-planner" },
                  { label: "Proposal Character Counter", href: "/tools/proposal-counter" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A] dark:text-white/55 dark:hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A0A0A]/40 dark:text-white/40">
                Resources
              </h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="/#faq" className="text-sm text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A] dark:text-white/55 dark:hover:text-white">
                    FAQ
                  </Link>
                </li>
                <li>
                  <a href="mailto:hello@getupscore.com" className="text-sm text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A] dark:text-white/55 dark:hover:text-white">
                    Help &amp; Support
                  </a>
                </li>
                <li>
                  <a href="mailto:hello@getupscore.com" className="text-sm text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A] dark:text-white/55 dark:hover:text-white">
                    Contact Us
                  </a>
                </li>
                <li>
                  <Link href="/affiliate" className="text-sm text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A] dark:text-white/55 dark:hover:text-white">
                    Affiliate Program
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A0A0A]/40 dark:text-white/40">
                Legal
              </h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="/terms" className="text-sm text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A] dark:text-white/55 dark:hover:text-white">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A] dark:text-white/55 dark:hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="text-sm text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A] dark:text-white/55 dark:hover:text-white">
                    Security Architecture
                  </Link>
                </li>
                <li>
                  <Link href="/status" className="text-sm text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A] dark:text-white/55 dark:hover:text-white">
                    Status Telemetry
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[#0A0A0A]/10 pt-6 text-xs leading-5 text-[#0A0A0A]/45 sm:flex-row dark:border-white/10 dark:text-white/45">
            <span>© 2026 UpScore. AI-powered Upwork opportunity finder. Built for contractors.</span>
            <span>Upwork® is a registered trademark of Upwork Inc.</span>
          </div>
        </div>
      </footer>
    </section>
  );
}