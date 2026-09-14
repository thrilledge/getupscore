"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Hash,
  Mail,
  MessageCircle,
  Network,
  Route,
  Send,
  Webhook,
} from "lucide-react";

const channels = [
  { name: "WhatsApp", desc: "Instant mobile push", icon: MessageCircle },
  { name: "Webhooks", desc: "Custom JSON payloads", icon: Webhook },
  { name: "Slack", desc: "Dedicated #leads channel", icon: Hash },
  { name: "Telegram", desc: "<5s notification speeds", icon: Send },
  { name: "n8n", desc: "Self-hosted pipelines", icon: Network },
  { name: "Make", desc: "Airtable & CRM routing", icon: Route },
  { name: "Zapier", desc: "5,000+ app connectors", icon: ArrowRightLeft },
  { name: "Gmail", desc: "High-conviction digests", icon: Mail },
];

const tileAccents = [
  "text-[#00C98B]",
  "text-[#00A975]",
  "text-[#00C98B]/80",
  "text-[#00A975]",
  "text-[#00C98B]",
  "text-[#00A975]",
  "text-[#00C98B]",
  "text-[#00A975]",
];

export function Integrations() {
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

  return (
    <section
      ref={sectionRef}
      id="integrations"
      className="relative scroll-mt-24 overflow-hidden border-y border-[#0A0A0A]/10 bg-[#F7FFFC] py-20 sm:py-24 lg:py-28"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-32 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 bottom-24 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]" />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div
          style={{ transitionDelay: isVisible ? "100ms" : "0ms" }}
          className={`mx-auto max-w-3xl text-center transition-all duration-700 ease-out ${isVisible ? "translate-y-0 opacity-100 blur-0" : "translate-y-10 opacity-0 blur-[4px]"}`}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00C98B]/25 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0A0A0A]/70 shadow-sm backdrop-blur-sm">
            <span className="relative flex size-2">
              {isVisible && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-40 motion-reduce:animate-none" />
              )}
              <span className="relative inline-flex size-2 rounded-full bg-[#00C98B]" />
            </span>
            Zero Tab Juggling
          </div>

          <h2 className="font-heading text-4xl font-bold leading-[1.1] tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl">
            Alerts that reach you <br />
            <span className="text-[#00C98B]">where you work</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#0A0A0A]/60 sm:text-lg">
            Never sit on the Upwork feed refreshing manually. Connect UpScore
            directly to your favorite communication and automation stack.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:mt-16">
          {channels.map((ch, i) => {
            const Icon = ch.icon;
            return (
              <div
                key={ch.name}
                style={{ transitionDelay: isVisible ? `${200 + i * 60}ms` : "0ms" }}
                className={`group flex flex-col items-center gap-3 rounded-xl border border-[#0A0A0A]/10 bg-white p-4 text-center shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-[#F7FFFC] ${isVisible ? "translate-y-0 opacity-100 blur-0" : "translate-y-8 opacity-0 blur-[4px]"}`}
              >
                <span className={`grid size-12 place-items-center rounded-full transition-transform duration-300 group-hover:scale-110 ${tileAccents[i]}`}>
                  <Icon className="size-6" />
                </span>
                <span className="font-heading text-sm font-bold tracking-[-0.01em] text-[#0A0A0A]">
                  {ch.name}
                </span>
                <span className="text-xs leading-5 text-[#0A0A0A]/55">
                  {ch.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}