"use client";

import { useEffect, useRef, useState } from "react";
import { Apple, ArrowRight, Monitor, Puzzle, Smartphone } from "lucide-react";

type PlatformProps = {
  totalJobs: number;
  jobs24h: number;
  countryCount: string;
};

const platforms = [
  {
    name: "Web Platform",
    icon: Monitor,
    description:
      "Access UpScore from any browser. Jobs, AI scoring, proposals, and analytics — all in one place.",
    linkText: "Open Web App",
    href: "https://www.getupscore.com",
    available: true,
  },
  {
    name: "Chrome Extension",
    icon: Puzzle,
    description:
      "The Get UpScore extension sits right on Upwork — score jobs and draft proposals without leaving the page.",
    linkText: "Add to Chrome",
    href: "https://www.getupscore.com",
    available: true,
  },
  {
    name: "Android App",
    icon: Smartphone,
    description:
      "Mobile notifications and job management on the go. Never miss an opportunity with real-time push alerts.",
    linkText: "Coming soon",
    href: "",
    available: false,
  },
  {
    name: "iOS App",
    icon: Apple,
    description:
      "Full-featured iPhone and iPad support. All your UpScore tools, alert channels, and analytics on Apple devices.",
    linkText: "Coming soon",
    href: "",
    available: false,
  },
];

const stats = [
  { key: "tracked", label: "jobs tracked", value: (p: PlatformProps) => p.totalJobs.toLocaleString() },
  { key: "today", label: "new jobs today", value: (p: PlatformProps) => p.jobs24h.toLocaleString() },
  { key: "channels", label: "alert channels", value: () => "6" },
  { key: "countries", label: "client countries", value: (p: PlatformProps) => p.countryCount },
];

export function Platforms({ totalJobs, jobs24h, countryCount }: PlatformProps) {
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
        threshold: 0.1,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  const props: PlatformProps = { totalJobs, jobs24h, countryCount };

  return (
    <section
      ref={sectionRef}
      id="platforms"
      className="relative scroll-mt-24 overflow-hidden bg-white py-20 sm:py-24 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 bottom-24 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-24 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]"
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div
          style={{ transitionDelay: isVisible ? "100ms" : "0ms" }}
          className={`mx-auto max-w-3xl text-center transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
            ? "translate-y-0 opacity-100 blur-0"
            : "translate-y-10 opacity-0 blur-[4px]"
            }`}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0A0A0A]/70">
            <span className="relative flex size-2">
              {isVisible && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-40 motion-reduce:animate-none" />
              )}

              <span className="relative inline-flex size-2 rounded-full bg-[#00C98B]" />
            </span>

            Wherever you work
          </div>

          <h2 className="font-heading text-4xl font-bold leading-[1.1] tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl">
            Available everywhere <br />
            <span className="text-[#00C98B]">you work</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
            Access UpScore from any device — browser, phone, or tablet. Stay
            connected to job opportunities wherever you are.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {platforms.map((platform, index) => {
            const Tile = platform.icon;

            const cardClass = `group flex h-full flex-col rounded-[20px] border p-6 shadow-[0_14px_40px_rgba(0,0,0,0.05)] transition-all duration-300 ${
              platform.available
                ? "hover:-translate-y-1.5 hover:border-[#00C98B]/40 hover:shadow-[0_22px_55px_rgba(0,201,139,0.13)]"
                : "border-[#0A0A0A]/10 bg-white"
            }`;

            const inner = (
              <>
                <span
                  className={`grid size-12 place-items-center rounded-2xl border transition-all duration-300 group-hover:scale-105 ${
                    platform.available
                      ? "border-[#00C98B]/15 bg-[#00C98B]/10 text-[#00C98B]"
                      : "border-[#0A0A0A]/10 bg-[#0A0A0A]/5 text-[#0A0A0A]/40"
                  }`}
                >
                  <Tile className="size-6" aria-hidden="true" />
                </span>

                <h3 className="mt-5 font-heading text-lg font-bold tracking-[-0.02em] text-[#0A0A0A]">
                  {platform.name}
                </h3>

                <p className="mt-2 flex-1 text-sm leading-6 text-[#0A0A0A]/55">
                  {platform.description}
                </p>

                <div
                  className={`mt-5 flex items-center gap-2 text-sm font-medium transition-all duration-300 ${
                    platform.available
                      ? "text-[#00C98B] group-hover:gap-3"
                      : "inline-flex w-fit rounded-full border border-[#0A0A0A]/10 bg-[#0A0A0A]/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0A0A0A]/45"
                  }`}
                >
                  {platform.linkText}

                  {platform.available && (
                    <ArrowRight
                      className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </>
            );

            if (platform.available) {
              return (
                <a
                  key={platform.name}
                  href={platform.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    transitionDelay: isVisible ? `${250 + index * 100}ms` : "0ms",
                  }}
                  className={`${cardClass} ${
                    isVisible
                      ? "border-[#0A0A0A]/10 bg-white translate-y-0 opacity-100 blur-0"
                      : "border-[#0A0A0A]/10 bg-white translate-y-8 opacity-0 blur-[4px]"
                  } transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none`}
                >
                  {inner}
                </a>
              );
            }

            return (
              <div
                key={platform.name}
                style={{
                  transitionDelay: isVisible ? `${250 + index * 100}ms` : "0ms",
                }}
                className={`${cardClass} ${
                  isVisible
                    ? "translate-y-0 opacity-100 blur-0"
                    : "translate-y-8 opacity-0 blur-[4px]"
                } transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none`}
              >
                {inner}
              </div>
            );
          })}
        </div>

        <div
          style={{ transitionDelay: isVisible ? "600ms" : "0ms" }}
          className={`mt-16 grid grid-cols-2 gap-8 text-center transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none md:grid-cols-4 ${
            isVisible
              ? "translate-y-0 opacity-100 blur-0"
              : "translate-y-10 opacity-0 blur-[4px]"
          }`}
        >
          {stats.map((stat) => (
            <div key={stat.key}>
              <p className="font-heading text-3xl font-bold tracking-tight text-[#0A0A0A] md:text-4xl">
                {stat.value(props)}
              </p>

              <p className="mt-1 text-sm text-[#0A0A0A]/55">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}