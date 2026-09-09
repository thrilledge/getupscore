import Link from "next/link";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-gradient-to-b from-[#F2FFFA] via-[#F8FFFC] to-white lg:min-h-[calc(100svh-72px)]">
      <style>
        {`
          @keyframes heroRise {
            from {
              opacity: 0;
              transform: translateY(38px);
              filter: blur(5px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
              filter: blur(0);
            }
          }

          @keyframes underlineReveal {
            from {
              opacity: 0;
              transform: scaleX(0);
            }

            to {
              opacity: 1;
              transform: scaleX(1);
            }
          }

          @keyframes orbLeft {
            0%, 100% {
              transform: translate3d(0, 0, 0);
            }

            50% {
              transform: translate3d(35px, 25px, 0);
            }
          }

          @keyframes orbRight {
            0%, 100% {
              transform: translate3d(0, 0, 0);
            }

            50% {
              transform: translate3d(-35px, 30px, 0);
            }
          }

          .hero-reveal {
            opacity: 0;
            animation: heroRise 850ms cubic-bezier(0.16, 1, 0.3, 1)
              forwards;
            will-change: opacity, transform;
          }

          .hero-delay-1 {
            animation-delay: 80ms;
          }

          .hero-delay-2 {
            animation-delay: 180ms;
          }

          .hero-delay-3 {
            animation-delay: 300ms;
          }

          .hero-delay-4 {
            animation-delay: 420ms;
          }

          .hero-delay-5 {
            animation-delay: 540ms;
          }

          .hero-underline {
            opacity: 0;
            transform-origin: left;
            animation: underlineReveal 700ms
              cubic-bezier(0.16, 1, 0.3, 1) 850ms forwards;
          }

          .hero-orb-left {
            animation: orbLeft 10s ease-in-out infinite;
          }

          .hero-orb-right {
            animation: orbRight 12s ease-in-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .hero-reveal,
            .hero-underline,
            .hero-orb-left,
            .hero-orb-right {
              opacity: 1;
              animation: none;
              transform: none;
              filter: none;
            }
          }
        `}
      </style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,201,139,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 75% 70% at 50% 35%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 70% at 50% 35%, black, transparent)",
        }}
      />

      <div
        aria-hidden="true"
        className="hero-orb-left pointer-events-none absolute -left-32 top-20 size-[420px] rounded-full bg-[#00C98B]/10 blur-[100px]"
      />

      <div
        aria-hidden="true"
        className="hero-orb-right pointer-events-none absolute -right-32 top-0 size-[440px] rounded-full bg-[#00C98B]/10 blur-[110px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 size-[500px] -translate-x-1/2 rounded-full bg-[#00C98B]/5 blur-[120px]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-5 py-16 text-center sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="hero-reveal hero-delay-1 mx-auto mb-7 w-fit">
          <div className="group inline-flex cursor-default items-center gap-2 rounded-full border border-[#0A0A0A]/10 bg-white/75 px-4 py-2 text-xs font-semibold tracking-wide text-[#0A0A0A]/75 shadow-[0_8px_28px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#00C98B]/50 hover:shadow-[0_12px_32px_rgba(0,201,139,0.12)] sm:text-sm">
            <span className="grid size-6 place-items-center rounded-full bg-[#00C98B]/10">
              <Sparkles className="size-3.5 text-[#00C98B] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
            </span>

            AI-scored, real-time job alerts for freelancers
          </div>
        </div>

        <h1 className="hero-reveal hero-delay-2 mx-auto max-w-5xl font-heading text-[46px] font-bold leading-[1.1] tracking-[-0.03em] text-[#0A0A0A] sm:text-6xl lg:text-[78px] xl:text-[88px]">
          Never miss the{" "}
          <span className="relative inline-block whitespace-nowrap text-[#00C98B]">

            right

            <svg
              aria-hidden="true"
              viewBox="0 0 250 18"
              preserveAspectRatio="none"
              className="hero-underline absolute -bottom-1 left-0 h-3 w-full text-[#00C98B]/30"
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

          <span className="mt-2 block sm:mt-3">Upwork job again</span>
        </h1>

        <p className="hero-reveal hero-delay-3 mx-auto mt-7 max-w-3xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg sm:leading-8 lg:text-xl">
          {env.APP_NAME} scans Upwork every few minutes, scores every opportunity
          with AI, and alerts you the moment a job matches your skills — so you
          can reply while the competition is still reading.
        </p>

        <div className="hero-reveal hero-delay-4 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            render={<Link href="/signup" />}
            size="lg"
            className="group h-14 w-full rounded-full bg-[#0A0A0A] px-7 text-base font-bold text-white shadow-[0_14px_35px_rgba(0,0,0,0.16)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#0A0A0A]/90 hover:shadow-[0_18px_45px_rgba(0,0,0,0.22)] sm:w-auto"
          >
            Start finding jobs free

            <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>

          <Button
            render={<Link href="#jobs" />}
            variant="outline"
            size="lg"
            className="h-14 w-full rounded-full border-[#0A0A0A]/15 bg-white/60 px-8 text-base font-bold text-[#0A0A0A] shadow-none backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#00C98B]/60 hover:bg-[#00C98B]/10 hover:text-[#0A0A0A] sm:w-auto"
          >
            See live jobs
          </Button>
        </div>

        <div className="hero-reveal hero-delay-5 mx-auto mt-10 flex max-w-3xl flex-col items-center justify-center gap-4 text-sm font-medium text-[#0A0A0A]/60 sm:flex-row sm:gap-8">
          <span className="group inline-flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#0A0A0A]">
            <span className="grid size-8 place-items-center rounded-full bg-[#00C98B]/10 transition-colors group-hover:bg-[#00C98B]/20">
              <ShieldCheck className="size-4 text-[#00C98B]" />
            </span>

            Free to start
          </span>

          <span className="group inline-flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#0A0A0A]">
            <span className="grid size-8 place-items-center rounded-full bg-[#00C98B]/10 transition-colors group-hover:bg-[#00C98B]/20">
              <BrainCircuit className="size-4 text-[#00C98B]" />
            </span>

            AI analysis included
          </span>

          <span className="group inline-flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#0A0A0A]">
            <span className="grid size-8 place-items-center rounded-full bg-[#00C98B]/10 transition-colors group-hover:bg-[#00C98B]/20">
              <CalendarClock className="size-4 text-[#00C98B]" />
            </span>

            Cancel anytime
          </span>
        </div>
      </div>
    </section>
  );
}