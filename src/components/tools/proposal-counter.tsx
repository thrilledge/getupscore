"use client";

import { useMemo, useState } from "react";
import { fmtNumber } from "@/components/tools/tool-ui";
import { cn } from "@/lib/utils";

const COVER_LETTER_LIMIT = 5000;
const IDEAL_MIN = 1200;
const IDEAL_MAX = 3000;

export function ProposalCounter() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const chars = text.length;
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const sentences = trimmed
      ? (trimmed.match(/[.!?]+(\s|$)/g) || []).length
      : 0;
    const percent = Math.min(100, (chars / COVER_LETTER_LIMIT) * 100);
    const remaining = Math.max(0, COVER_LETTER_LIMIT - chars);
    const readingMin = Math.max(1, Math.ceil(words / 200));

    let verdict: {
      tone: string;
      label: string;
      message: string;
    };
    if (chars === 0) {
      verdict = {
        tone: "neutral",
        label: "Start typing",
        message: "Your draft will be counted live as you type.",
      };
    } else if (chars > COVER_LETTER_LIMIT) {
      verdict = {
        tone: "error",
        label: "Over the limit",
        message: `Upwork won't accept more than ${COVER_LETTER_LIMIT.toLocaleString()} characters. Trim by ${fmtNumber(-remaining)}.`,
      };
    } else if (chars >= IDEAL_MIN && chars <= IDEAL_MAX) {
      verdict = {
        tone: "good",
        label: "Sweet spot",
        message: "Long enough to show substance, short enough to stay readable.",
      };
    } else if (chars < IDEAL_MIN) {
      verdict = {
        tone: "warn",
        label: "On the short side",
        message: "Add specifics — a relevant project, a metric, a question.",
      };
    } else {
      verdict = {
        tone: "warn",
        label: "Getting long",
        message: "Focus on the top 2–3 points the client cares about.",
      };
    }

    return { chars, words, sentences, percent, remaining, readingMin, verdict };
  }, [text]);

  const toneStyles: Record<string, string> = {
    neutral: "border-black/10 bg-[#F7F8F8] text-[#0A0A0A]/60",
    good: "border-[#00C98B]/40 bg-[#F0FDF8] text-[#007A56]",
    warn: "border-amber-300/60 bg-amber-50 text-amber-700",
    error: "border-red-300 bg-red-50 text-red-600",
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-[#0A0A0A]/10 bg-white p-5 shadow-[0_8px_28px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-bold text-[#0A0A0A]">
            Your proposal draft
          </h2>
          <button
            type="button"
            onClick={() => setText("")}
            disabled={!text}
            className="h-8 rounded-lg border border-[#0A0A0A]/10 bg-[#F7F8F8] px-3 text-[11px] font-semibold text-[#0A0A0A]/60 transition-colors hover:border-[#00C98B]/40 hover:text-[#00A975] disabled:opacity-40"
          >
            Clear
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write or paste your Upwork cover letter here…"
          rows={12}
          className="w-full resize-y rounded-xl border border-[#0A0A0A]/10 bg-[#F7FFFC] p-4 text-sm leading-6 text-[#0A0A0A] outline-none transition-colors placeholder:text-[#0A0A0A]/30 focus:border-[#00C98B] focus:ring-2 focus:ring-[#00C98B]/15"
        />

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#0A0A0A]/55">
            <span>
              {fmtNumber(stats.chars).toLocaleString()} / {COVER_LETTER_LIMIT.toLocaleString()} characters
            </span>
            <span className={stats.remaining > 0 ? "text-[#00A975]" : "text-red-500"}>
              {stats.remaining > 0
                ? `${fmtNumber(stats.remaining)} left`
                : "over limit"}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#0A0A0A]/10">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                stats.percent >= 100
                  ? "bg-red-500"
                  : stats.percent >= 80
                    ? "bg-amber-400"
                    : "bg-[#00C98B]"
              )}
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid content-start gap-3">
        <div
          className={cn(
            "rounded-2xl border p-4 sm:p-5",
            toneStyles[stats.verdict.tone]
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]">
            {stats.verdict.label}
          </p>
          <p className="mt-1.5 text-xs leading-5">
            {stats.verdict.message}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Characters", value: fmtNumber(stats.chars).toLocaleString() },
            { label: "Words", value: fmtNumber(stats.words).toLocaleString() },
            { label: "Sentences", value: fmtNumber(stats.sentences).toLocaleString() },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[#0A0A0A]/10 bg-[#F7FFFC] p-3.5"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A]/45">
                {item.label}
              </p>
              <p className="mt-1 font-heading text-lg font-bold tabular-nums text-[#0A0A0A]">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#0A0A0A]/10 bg-[#F7FFFC] p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0A0A0A]/45">
            Reading time
          </p>
          <p className="mt-1.5 text-sm font-bold text-[#0A0A0A]">
            ~{fmtNumber(stats.readingMin)} min
          </p>
          <p className="mt-1 text-[11px] leading-4 text-[#0A0A0A]/50">
            At an average 200 wpm. Clients skim — lead with your value in the first two lines.
          </p>
        </div>
      </div>
    </div>
  );
}