"use client";

import { useEffect, useRef, useState } from "react";
import { Star, BadgeCheck, Send, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Review = {
  id: string;
  name: string;
  role: string | null;
  rating: number;
  message: string;
};

const fallbackReviews: Review[] = [
  {
    id: "fallback-1",
    name: "Areeb K.",
    role: "Full-stack Cloud Engineer · Upwork Top Rated Plus ($180k+ earned)",
    rating: 5,
    message:
      "I used to refresh Upwork every 15 minutes and lose deals to fast bidders. Now UpScore alerts land on my Telegram before I even open my laptop. Landed two $5k+ monthly retainers in my first three weeks.",
  },
  {
    id: "fallback-2",
    name: "Sana M.",
    role: "UI/UX Designer · Upwork Rising Talent ($80k+ earned)",
    rating: 5,
    message:
      "The AI scoring saves me connects. I used to bid on everything blindly; now I only chase jobs the algorithm flags as a genuine fit. My win rate tripled in two months.",
  },
  {
    id: "fallback-3",
    name: "Bilal R.",
    role: "Content Strategist · Upwork Top Rated ($60k+ earned)",
    rating: 5,
    message:
      "The proposal drafts are genuinely good. I take the AI draft, tweak two lines, and send — my response rate went way up. It feels like having a full-time research assistant.",
  },
];

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

function ReviewFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, rating, message }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setSubmitError(json.error ?? "Failed to submit review");
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-[#00C98B]/60 focus:outline-none focus:ring-2 focus:ring-[#00C98B]/20";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[auto] overflow-y-hidden overflow-x-hidden rounded-2xl border-none bg-[#0A0A0A] p-0 text-white sm:max-w-lg">
        <div aria-hidden="true" className="absolute -bottom-20 -right-20 size-64 rounded-full bg-[#00C98B]/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-1 bg-[#00C98B]" />
        {/* <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close review form"
          className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button> */}

        <div className="relative z-10 p-6 sm:p-8">
          {submitted ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-[#00C98B]/15">
                <BadgeCheck className="size-6 text-[#00C98B]" />
              </span>
              <p className="font-heading text-lg font-bold text-white">
                Review submitted!
              </p>
              <p className="max-w-xs text-sm leading-6 text-white/55">
                Thanks for sharing your experience. Our team will review it and
                publish it here shortly.
              </p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#00C98B] px-5 py-3 text-sm font-bold text-[#0A0A0A] shadow-[0_0_24px_rgba(0,201,139,0.3)] transition-all hover:bg-[#00C98B]/90"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogTitle className="font-heading text-lg font-bold text-white">
                Share your success story
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-white/50">
                Your review appears after a quick moderation.
              </DialogDescription>

              <div>
                <label
                  htmlFor="review-rating"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40"
                >
                  Rating
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-label={`Rate ${s} out of 5`}
                      onClick={() => setRating(s)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`size-6 ${s <= rating
                          ? "fill-[#00C98B] text-[#00C98B]"
                          : "fill-white/10 text-white/20"
                          }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="review-name"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40"
                >
                  Name
                </label>
                <input
                  id="review-name"
                  type="text"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ahmed R."
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="review-role"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40"
                >
                  Role / headline
                </label>
                <input
                  id="review-role"
                  type="text"
                  maxLength={160}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Full-stack Developer · Top Rated"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="review-message"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40"
                >
                  Your review
                </label>
                <textarea
                  id="review-message"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How has UpScore helped you win more work?"
                  className={`${inputClass} resize-none leading-6`}
                />
              </div>

              {submitError && (
                <p className="text-xs font-medium text-red-400">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C98B] px-5 py-3 text-sm font-bold text-[#0A0A0A] shadow-[0_0_24px_rgba(0,201,139,0.3)] transition-all hover:bg-[#00C98B]/90 hover:shadow-[0_0_32px_rgba(0,201,139,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  "Submitting…"
                ) : (
                  <>
                    Submit review
                    <Send className="size-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Testimonials() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [active, setActive] = useState(0);
  const [reviews, setReviews] = useState<Review[]>(fallbackReviews);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

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
    let cancelled = false;
    fetch("/api/reviews?limit=6")
      .then((res) => res.json())
      .then((json: { ok?: boolean; reviews?: Review[] }) => {
        if (cancelled) return;
        if (json.ok && Array.isArray(json.reviews) && json.reviews.length > 0) {
          setReviews(json.reviews);
        }
      })
      .catch(() => {
        // keep fallback reviews offline
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % reviews.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [isVisible, reviews.length]);

  const total = String(reviews.length).padStart(2, "0");
  const t = reviews[Math.min(active, reviews.length - 1)];

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
                    Case {String(active + 1).padStart(2, "0")} / {total}
                  </span>
                </div>

                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`size-4 ${s <= t.rating
                        ? "fill-[#00C98B] text-[#00C98B]"
                        : "fill-white/15 text-white/20"
                        }`}
                    />
                  ))}
                </div>
              </div>

              {/* Quote */}
              <blockquote className="font-heading text-lg font-medium leading-relaxed text-white sm:text-xl lg:text-2xl">
                &ldquo;{t.message}&rdquo;
              </blockquote>

              {/* Author row */}
              <div className="flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-full bg-[#00C98B]/20 font-heading text-sm font-bold text-[#00C98B]">
                    {initialsOf(t.name)}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-heading text-sm font-bold text-white">
                      {t.name}
                    </span>
                    {t.role && (
                      <span className="mt-0.5 text-xs text-white/55">
                        {t.role}
                      </span>
                    )}
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
              {reviews.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Show review ${i + 1}`}
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${active === i
                    ? "w-7 bg-[#00C98B]"
                    : "w-1.5 bg-white/20 hover:bg-white/40"
                    }`}
                />
              ))}
            </div>

            {/* Share your review */}
            <div className="relative z-10 mt-6 flex justify-center border-t border-white/10 pt-5">
              <button
                type="button"
                onClick={() => {
                  setFormKey((k) => k + 1);
                  setFormOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#00C98B] px-6 py-2.5 text-sm font-bold text-[#0A0A0A] shadow-[0_0_24px_rgba(0,201,139,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(0,201,139,0.5)]"
              >
                <Sparkles className="size-4" />
                Share your review
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReviewFormDialog key={formKey} open={formOpen} onOpenChange={setFormOpen} />
    </section>
  );
}