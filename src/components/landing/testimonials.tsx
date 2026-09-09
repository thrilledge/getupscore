"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { env } from "@/lib/env";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "I used to refresh Upwork every 15 minutes. Now the alerts land before I even open the app — I've stopped missing the good posts entirely.",
    name: "Areeb K.",
    role: "Full-stack developer",
    initials: "AK",
  },
  {
    quote:
      "The AI scoring saves me connects. I used to bid on everything; now I only chase jobs the analysis flags as a strong fit.",
    name: "Sana M.",
    role: "UI/UX designer",
    initials: "SM",
  },
  {
    quote:
      "The proposal drafts are genuinely good. I take the draft, tweak two lines, and send. My response rate went way up.",
    name: "Bilal R.",
    role: "Content writer",
    initials: "BR",
  },
];

export function Testimonials() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [isPaused, setIsPaused] = useState(false);
  const [animatingKey, setAnimatingKey] = useState(0);

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
        threshold: 0.18,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || isPaused) return;

    const interval = window.setInterval(() => {
      setDirection("left");
      setActiveIndex((currentIndex) => (currentIndex + 1) % testimonials.length);
      setAnimatingKey((prev) => prev + 1);
    }, 2000);

    return () => window.clearInterval(interval);
  }, [isVisible, isPaused]);

  function showPrevious() {
    setDirection("right");
    setActiveIndex(
      (currentIndex) =>
        (currentIndex - 1 + testimonials.length) % testimonials.length
    );
    setAnimatingKey((prev) => prev + 1);
  }

  function showNext() {
    setDirection("left");
    setActiveIndex(
      (currentIndex) => (currentIndex + 1) % testimonials.length
    );
    setAnimatingKey((prev) => prev + 1);
  }

  function showTestimonial(index: number) {
    if (index === activeIndex) return;
    setDirection(index > activeIndex ? "left" : "right");
    setActiveIndex(index);
    setAnimatingKey((prev) => prev + 1);
  }

  const activeTestimonial = testimonials[activeIndex];

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      className="relative scroll-mt-24 overflow-hidden bg-white py-10 sm:py-16 lg:py-24"
    >
      <style>
        {`
          @keyframes testimonialFromLeft {
            0% {
              opacity: 0;
              transform: translateX(-20px);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes testimonialFromRight {
            0% {
              opacity: 0;
              transform: translateX(20px);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .testimonial-slide-left {
            animation: testimonialFromLeft 450ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }

          .testimonial-slide-right {
            animation: testimonialFromRight 450ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }

          @media (prefers-reduced-motion: reduce) {
            .testimonial-slide-left,
            .testimonial-slide-right {
              animation: none;
            }
          }
        `}
      </style>

      {/* Background Ambient Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-48 top-24 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 bottom-10 size-[420px] rounded-full bg-[#00C98B]/10 blur-[130px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,201,139,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.05) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
        <div
          style={{
            transitionDelay: isVisible ? "100ms" : "0ms",
          }}
          className={`mx-auto max-w-3xl text-center transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
            ? "translate-y-0 opacity-100 blur-0"
            : "translate-y-10 opacity-0 blur-[4px]"
            }`}
        >
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[#0A0A0A]/70">
            <span className="relative flex size-1.5 sm:size-2">
              {isVisible && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-40 motion-reduce:animate-none" />
              )}
              <span className="relative inline-flex size-1.5 sm:size-2 rounded-full bg-[#00C98B]" />
            </span>
            Loved by freelancers
          </div>

          <h2 className="font-heading text-4xl font-bold tracking-[-0.035em] text-[#0A0A0A] sm:text-5xl leading-[1.1]">
            Freelancers win more <br /> with{" "}
            <span className="text-[#00C98B]">{env.APP_NAME}</span>
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-[11px] sm:text-sm leading-relaxed text-[#0A0A0A]/60">
            Real freelancers using smarter job discovery to save time, protect
            their connects, and win better opportunities.
          </p>
        </div>

        <div
          style={{
            transitionDelay: isVisible ? "280ms" : "0ms",
          }}
          className={`mx-auto mt-6 sm:mt-10 max-w-4xl transition-all duration-700 ease-out lg:mt-12 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${isVisible
            ? "translate-y-0 opacity-100 blur-0"
            : "translate-y-12 opacity-0 blur-[5px]"
            }`}
        >
          <div
            role="region"
            aria-label="Freelancer testimonials"
            aria-roledescription="carousel"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocusCapture={() => setIsPaused(true)}
            onBlurCapture={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null
                )
              ) {
                setIsPaused(false);
              }
            }}
            className="relative"
          >
            <Card className="group relative min-h-[260px] sm:min-h-[320px] overflow-hidden rounded-[18px] sm:rounded-[24px] border border-white/10 bg-[#0A0A0A] py-0 text-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-shadow duration-300 hover:shadow-[0_25px_70px_rgba(0,201,139,0.15)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-[#00C98B]" />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#00C98B]/15 blur-[90px]"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-32 -left-20 size-72 rounded-full bg-[#00C98B]/10 blur-[100px]"
              />

              <div
                key={animatingKey}
                className={
                  direction === "left"
                    ? "testimonial-slide-left"
                    : "testimonial-slide-right"
                }
              >
                <CardContent className="relative flex min-h-[260px] sm:min-h-[320px] flex-col justify-between p-4 sm:p-7 lg:p-9">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="grid size-8 place-items-center rounded-lg sm:size-10 sm:rounded-xl border border-[#00C98B]/20 bg-[#00C98B]/10">
                        <Quote className="size-3.5 sm:size-5 fill-[#00C98B] text-[#00C98B]" />
                      </span>

                      <span className="font-heading text-[10px] sm:text-xs font-bold tracking-wider text-white/40">
                        {String(activeIndex + 1).padStart(2, "0")} /{" "}
                        {String(testimonials.length).padStart(2, "0")}
                      </span>
                    </div>

                    <blockquote className="mt-3.5 sm:mt-5 max-w-3xl font-heading text-sm font-semibold leading-normal tracking-[-0.01em] text-white sm:text-xl lg:text-2xl lg:leading-snug">
                      “{activeTestimonial.quote}”
                    </blockquote>

                    <div
                      aria-label="5 out of 5 stars"
                      className="mt-3 flex gap-0.5 sm:mt-4 sm:gap-1"
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className="size-3 sm:size-3.5 fill-[#00C98B] text-[#00C98B]"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:mt-6 sm:gap-3 sm:rounded-2xl sm:p-3.5">
                    <span className="grid size-8 sm:size-10 shrink-0 place-items-center rounded-full bg-[#00C98B] text-[10px] sm:text-xs font-black text-[#0A0A0A] shadow-[0_6px_20px_rgba(0,201,139,0.2)]">
                      {activeTestimonial.initials}
                    </span>

                    <div className="flex flex-col justify-center">
                      <div className="font-heading text-xs sm:text-sm font-bold text-white leading-tight">
                        {activeTestimonial.name}
                      </div>

                      <div className="mt-0.5 text-[10px] sm:text-xs text-white/60 leading-tight">
                        {activeTestimonial.role}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>

            {/* Pagination Controls */}
            <div className="mt-4 flex items-center justify-center sm:justify-between gap-4 sm:mt-6">
              {/* Pagination Dots */}
              <div className="flex items-center gap-1.5">
                {testimonials.map((testimonial, index) => (
                  <button
                    key={testimonial.name}
                    type="button"
                    aria-label={`Show testimonial ${index + 1}`}
                    aria-current={activeIndex === index}
                    onClick={() => showTestimonial(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C98B] focus-visible:ring-offset-2 ${activeIndex === index
                      ? "w-6 sm:w-7 bg-[#00C98B]"
                      : "w-1.5 bg-[#0A0A0A]/15 hover:bg-[#00C98B]/50"
                      }`}
                  />
                ))}
              </div>

              {/* Navigation Arrows - Hidden on Mobile */}
              <div className="hidden sm:flex items-center gap-2.5">
                <button
                  type="button"
                  aria-label="Previous testimonial"
                  onClick={showPrevious}
                  className="grid size-9 place-items-center rounded-full border border-[#0A0A0A]/10 bg-white text-[#0A0A0A] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B] hover:bg-[#00C98B]/10 hover:text-[#00A975] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C98B]"
                >
                  <ChevronLeft className="size-4" />
                </button>

                <button
                  type="button"
                  aria-label="Next testimonial"
                  onClick={showNext}
                  className="grid size-9 place-items-center rounded-full bg-[#0A0A0A] text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#00C98B] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C98B] focus-visible:ring-offset-2"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}