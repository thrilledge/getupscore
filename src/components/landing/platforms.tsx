"use client";

import { useEffect, useRef, useState } from "react";
import { Apple, ArrowRight, Globe, Puzzle, Smartphone } from "lucide-react";

type PlatformProps = {
  totalJobs: number;
  jobs24h: number;
  countryCount: string;
};

const platforms = [
  {
    name: "Web Platform",
    icon: Globe,
    badge: "AVAILABLE NOW",
    badgeStyle: "bg-[#00C98B]/10 text-[#00C98B]",
    description:
      "Full desktop command center with custom regex rule builder, analytics feeds, and instant proposal generator.",
    linkText: "Open Web App",
    href: "https://www.getupscore.com",
    available: true,
  },
  {
    name: "Chrome Extension",
    icon: Puzzle,
    badge: "AVAILABLE NOW",
    badgeStyle: "bg-[#00C98B]/10 text-[#00C98B]",
    description:
      "Overlays UpScore ratings and client hire histories directly on the native Upwork browse screen.",
    linkText: "Add to Chrome",
    href: "https://www.getupscore.com",
    available: true,
  },
  {
    name: "Android App",
    icon: Smartphone,
    badge: "BETA Q3 2026",
    badgeStyle: "bg-[#0A0A0A]/10 text-[#0A0A0A]/50",
    description:
      "Native push notifications, instant 1-tap proposal bookmarking, and local background telemetry sync.",
    linkText: "Waitlist open",
    href: "",
    available: false,
  },
  {
    name: "iOS App",
    icon: Apple,
    badge: "TESTFLIGHT SOON",
    badgeStyle: "bg-[#0A0A0A]/10 text-[#0A0A0A]/50",
    description:
      "Live Activity widgets on lock screen showing high-score job alerts the moment they hit the market.",
    linkText: "Waitlist open",
    href: "",
    available: false,
  },
];

const stats = [
  {
    key: "tracked",
    label: "Total Scanned",
    value: (p: PlatformProps) => p.totalJobs.toLocaleString(),
    sublabel: "Jobs tracked daily",
    color: "text-[#00C98B]",
  },
  {
    key: "today",
    label: "Today's Inflow",
    value: (p: PlatformProps) => p.jobs24h.toLocaleString(),
    sublabel: "Qualified matches",
    color: "text-[#00A975]",
  },
  {
    key: "channels",
    label: "Integrations",
    value: () => "6",
    sublabel: "Active alert channels",
    color: "text-[#0A0A0A]",
  },
  {
    key: "countries",
    label: "Global Reach",
    value: (p: PlatformProps) => p.countryCount,
    sublabel: "Client countries indexed",
    color: "text-[#00C98B]",
  },
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
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
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
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 bottom-24 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-24 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div
          style={{ transitionDelay: isVisible ? "100ms" : "0ms" }}
          className={`text-left transition-all duration-700 ease-out ${isVisible ? "translate-y-0 opacity-100 blur-0" : "translate-y-10 opacity-0 blur-[4px]"}`}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0A0A0A]/70">
            <span className="relative flex size-2">
              {isVisible && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-40 motion-reduce:animate-none" />
              )}
              <span className="relative inline-flex size-2 rounded-full bg-[#00C98B]" />
            </span>
            Multi-Surface Access
          </div>

          <h2 className="font-heading text-4xl font-bold leading-[1.1] tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl">
            Available everywhere <br className="hidden sm:block" />
            <span className="text-[#00C98B]">you work</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {platforms.map((platform, index) => {
            const Tile = platform.icon;
            const CardTag = platform.available ? "a" : "div";
            const cardProps = platform.available
              ? { href: platform.href, target: "_blank", rel: "noopener noreferrer" }
              : {};

            return (
              <CardTag
                key={platform.name}
                {...cardProps}
                style={{ transitionDelay: isVisible ? `${200 + index * 100}ms` : "0ms" }}
                className={`group flex h-full flex-col justify-between rounded-2xl p-6 transition-all duration-700 ease-out ${isVisible ? "translate-y-0 opacity-100 blur-0" : "translate-y-8 opacity-0 blur-[4px]"
                  } ${platform.available
                    ? "border border-[#0A0A0A]/10 bg-white shadow-xl hover:-translate-y-1.5 hover:border-[#00C98B]/40 hover:shadow-[0_22px_55px_rgba(0,201,139,0.13)]"
                    : "border border-[#0A0A0A]/10 bg-[#F7FFFC] opacity-50 shadow-md"
                  }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Tile className={`size-7 ${platform.available ? "text-[#00C98B]" : "text-[#0A0A0A]/40"}`} />
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${platform.badgeStyle}`}>
                      {platform.badge}
                    </span>
                  </div>

                  <h3 className="font-heading text-lg font-bold tracking-[-0.02em] text-[#0A0A0A]">
                    {platform.name}
                  </h3>

                  <p className="flex-1 text-sm leading-6 text-[#0A0A0A]/55">
                    {platform.description}
                  </p>
                </div>

                {platform.available ? (
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[#00C98B] group-hover:gap-2.5 transition-all duration-300">
                    {platform.linkText}
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                ) : (
                  <span className="mt-6 text-sm font-medium text-[#0A0A0A]/45">
                    {platform.linkText}
                  </span>
                )}
              </CardTag>
            );
          })}
        </div>

        <div
          style={{ transitionDelay: isVisible ? "600ms" : "0ms" }}
          className={`mt-16 grid grid-cols-2 gap-6 rounded-2xl border border-[#0A0A0A]/10 bg-white p-6 shadow-xl transition-all duration-700 ease-out md:grid-cols-4 ${isVisible ? "translate-y-0 opacity-100 blur-0" : "translate-y-10 opacity-0 blur-[4px]"}`}
        >
          {stats.map((stat) => (
            <div key={stat.key} className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wide text-[#0A0A0A]/45">
                {stat.label}
              </span>
              <span className={`mt-1 font-heading text-3xl font-bold tracking-tight md:text-4xl ${stat.color}`}>
                {stat.value(props)}
              </span>
              <span className="mt-1 text-xs text-[#0A0A0A]/50">
                {stat.sublabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}