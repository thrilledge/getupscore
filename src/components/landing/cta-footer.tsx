"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

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
      {
        threshold: 0.15,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-t border-[#0A0A0A]/10"
    >
      {/* CTA */}
      <div className="relative overflow-hidden bg-[#F7FFFC]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.06) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
            maskImage:
              "radial-gradient(ellipse 75% 75% at 50% 50%, black, transparent)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 75% at 50% 50%, black, transparent)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-[#00C98B]/15 blur-[120px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 top-0 size-[350px] rounded-full bg-[#00C98B]/10 blur-[120px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-0 size-[350px] rounded-full bg-[#00C98B]/10 blur-[120px]"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div
            style={{
              transitionDelay: isVisible ? "100ms" : "0ms",
            }}
            className={`text-center transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
              ? "translate-y-0 opacity-100 blur-0"
              : "translate-y-12 opacity-0 blur-[4px]"
              }`}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#00C98B]/25 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#0A0A0A]/70 shadow-sm backdrop-blur-sm">
              <span className="relative flex size-2">
                {isVisible && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-40 motion-reduce:animate-none" />
                )}

                <span className="relative inline-flex size-2 rounded-full bg-[#00C98B]" />
              </span>

              Start winning today
            </div>

            <h2 className="mx-auto max-w-3xl font-heading text-4xl font-bold leading-[1.1] tracking-tight text-[#0A0A0A] sm:text-5xl lg:text-6xl">
              Your next big project is posted{" "}
              <span className="relative inline-block tracking-normal text-[#00C98B]">
                right now

                <svg
                  aria-hidden="true"
                  viewBox="0 0 250 18"
                  preserveAspectRatio="none"
                  className="absolute -bottom-2 left-0 h-3 w-full text-[#00C98B]/25"
                >
                  <path
                    d="M4 8 C70 15, 170 15, 246 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
              Join {env.APP_NAME} free and get a head start on every opportunity
              that matches your skills.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                render={<Link href="/signup" />}
                size="lg"
                className="group h-12 w-full rounded-full bg-[#0A0A0A] px-7 text-base font-bold text-white shadow-[0_14px_35px_rgba(0,0,0,0.16)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#0A0A0A]/90 hover:shadow-[0_18px_45px_rgba(0,0,0,0.22)] sm:w-auto"
              >
                Get started free

                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>

              <Button
                render={<Link href="/login" />}
                variant="outline"
                size="lg"
                className="h-12 w-full rounded-full border-[#0A0A0A]/15 bg-white/70 px-7 text-base font-bold text-[#0A0A0A] shadow-none backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#00C98B]/60 hover:bg-[#00C98B]/10 hover:text-[#0A0A0A] sm:w-auto"
              >
                I already have an account
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium text-[#0A0A0A]/55">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-[#00C98B]" />
                Free to start
              </span>

              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-[#00C98B]" />
                No credit card
              </span>

              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-[#00C98B]" />
                Setup in minutes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Black footer */}
      <footer className="relative overflow-hidden border-t border-white/10 bg-[#0A0A0A]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-[500px] -translate-x-1/2 rounded-full bg-[#00C98B]/10 blur-[90px]"
        />

        <div
          style={{
            transitionDelay: isVisible ? "350ms" : "0ms",
          }}
          className={`relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 py-9 transition-all duration-700 ease-out sm:flex-row sm:px-8 lg:px-12 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${isVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0"
            }`}
        >
          <Link
            href="/"
            aria-label={`${env.APP_NAME} home`}
            className="rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00C98B]"
          >
            <img
              src="/upscore-logo.png"
              alt="UpScore"
              width={50}
              height={40}
              className="h-[70px] w-auto object-contain"
            />
          </Link>

          <p className="text-center text-xs leading-5 text-white/45 sm:text-right">
            © {new Date().getFullYear()} {env.APP_NAME}. AI-powered Upwork
            opportunity finder.
          </p>
        </div>
      </footer>
    </section>
  );
}