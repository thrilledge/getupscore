"use client";

import { useEffect, useRef, useState } from "react";
import { Star, BadgeCheck } from "lucide-react";

const testimonials = [
  {
    case: "01",
    total: "03",
    quote:
      "I used to refresh Upwork every 15 minutes and lose deals to fast bidders. Now UpScore alerts land on my Telegram before I even open my laptop. Landed two $5k+ monthly retainers in my first three weeks.",
    name: "Areeb K.",
    initials: "AK",
    role: "Full-stack Cloud Engineer · Upwork Top Rated Plus ($180k+ earned)",
  },
  {
    case: "02",
    total: "03",
    quote:
      "The AI scoring saves me connects. I used to bid on everything blindly; now I only chase jobs the algorithm flags as a genuine fit. My win rate tripled in two months.",
    name: "Sana M.",
    initials: "SM",
    role: "UI/UX Designer · Upwork Rising Talent ($80k+ earned)",
  },
  {
    case: "03",
    total: "03",
    quote:
      "The proposal drafts are genuinely good. I take the AI draft, tweak two lines, and send — my response rate went way up. It feels like having a full-time research assistant.",
    name: "Bilal R.",
    initials: "BR",
    role: "Content Strategist · Upwork Top Rated ($60k+ earned)",
  },
];

export function Testimonials() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [active, setActive] = useState(0);

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
      { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % testimonials.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [isVisible]);

  const t = testimonials[active];

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      className="relative scroll-mt-24 overflow-hidden bg-white py-20 sm:py-24 lg:py-28"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-48 top-24 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-48 bottom-10 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]" />

      <div className="relative mx-auto max-w-4xl px-5 sm:px-8 lg:px-12">
        <div
          style={{ transitionDelay: isVisible ? "100ms" : "0ms" }}
          className={`transition-all duration-700 ease-out ${isVisible ? "translate-y-0 opacity-100 blur-0" : "translate-y-12 opacity-0 blur-[5px]"}`}
        >
          <div className="group relative overflow-hidden rounded-2xl bg-[#0A0A0A] p-6 shadow-2xl sm:p-8 lg:p-10">
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-24 size-80 rounded-full bg-[#00C98B]/10 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#00C98B]/8 blur-[90px]" />
            <div className="absolute inset-x-0 top-0 h-1 bg-[#00C98B]" />

            <div className="relative z-10 flex flex-col gap-6">
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#00C98B]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00C98B]">
                    PROOF OF VALUE
                  </span>
                  <span className="text-xs font-bold text-white/40">
                    Case {t.case} / {t.total}
                  </span>
                </div>

                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="size-4 fill-[#00C98B] text-[#00C98B]" />
                  ))}
                </div>
              </div>

              {/* Quote */}
              <blockquote className="font-heading text-lg font-medium leading-relaxed text-white sm:text-xl lg:text-2xl">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author row */}
              <div className="flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-full bg-[#00C98B]/20 font-heading text-sm font-bold text-[#00C98B]">
                    {t.initials}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-heading text-sm font-bold text-white">
                      {t.name}
                    </span>
                    <span className="mt-0.5 text-xs text-white/55">
                      {t.role}
                    </span>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-3 py-1 text-xs font-bold text-[#00C98B]">
                  <BadgeCheck className="size-3.5" />
                  Verified Upwork Profile
                </span>
              </div>
            </div>

            {/* Navigation dots */}
            <div className="relative z-10 mt-5 flex items-center justify-center gap-1.5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Show testimonial ${i + 1}`}
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    active === i
                      ? "w-7 bg-[#00C98B]"
                      : "w-1.5 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}