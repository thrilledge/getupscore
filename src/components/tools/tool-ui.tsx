import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function fmtCurrency(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "$0";
  const abs = Math.abs(value);
  const formatted = abs >= 1000 ? abs.toLocaleString("en-US", { maximumFractionDigits: digits }) : abs.toFixed(digits);
  return `${value < 0 ? "-" : ""}$${formatted}`;
}

export function fmtNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

export function Field({
  label,
  hint,
  prefix,
  suffix,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-[#0A0A0A]/70 sm:text-xs">
          {label}
        </span>

      </span>
      <span className="flex h-11 w-full items-stretch overflow-hidden rounded-xl border border-[#0A0A0A]/10 bg-white focus-within:border-[#00C98B] focus-within:ring-2 focus-within:ring-[#00C98B]/15">
        {prefix && (
          <span className="flex items-center pl-3 text-sm font-semibold text-[#0A0A0A]/50">
            {prefix}
          </span>
        )}
        <input
          {...props}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-[#0A0A0A] outline-none placeholder:text-[#0A0A0A]/30",
            prefix && "pl-1.5"
          )}
        />
        {hint && (
          <span className="text-right text-[10px] text-[#0A0A0A]/40">
            {hint}
          </span>
        )}
        {suffix && (
          <span className="flex items-center pr-3 text-xs font-semibold text-[#0A0A0A]/40">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

export function ResultItem({
  label,
  value,
  helper,
  accent,
}: {
  label: string;
  value: string;
  helper?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        accent
          ? "border-[#00C98B]/40 bg-[#0A0A0A] text-white shadow-[0_14px_36px_rgba(0,201,139,0.14)]"
          : "border-[#0A0A0A]/10 bg-[#F7FFFC]"
      )}
    >
      <p
        className={cn(
          "text-[10px] font-bold uppercase tracking-[0.14em]",
          accent ? "text-[#00C98B]" : "text-[#0A0A0A]/45"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-heading text-xl font-bold tabular-nums tracking-tight sm:text-2xl",
          accent ? "text-white" : "text-[#0A0A0A]"
        )}
      >
        {value}
      </p>
      {helper && (
        <p
          className={cn(
            "mt-1.5 text-[11px] leading-4",
            accent ? "text-white/55" : "text-[#0A0A0A]/45"
          )}
        >
          {helper}
        </p>
      )}
    </div>
  );
}

export function ToolCard({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#0A0A0A]/10 bg-white p-5 shadow-[0_8px_28px_rgba(0,0,0,0.04)] sm:p-6",
        className
      )}
    >
      {title && (
        <div className="mb-4 border-b border-[#0A0A0A]/10 pb-3">
          <h2 className="font-heading text-sm font-bold text-[#0A0A0A]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs leading-5 text-[#0A0A0A]/50">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-semibold text-[#0A0A0A]/70 sm:text-xs">
        {label}
      </span>
      <div className="grid w-full grid-flow-col gap-1 rounded-xl border border-[#0A0A0A]/10 bg-[#F7F8F8] p-1">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={cn(
                "h-9 rounded-lg px-3 text-xs font-semibold transition-all",
                active
                  ? "bg-[#0A0A0A] text-[#00C98B] shadow-sm"
                  : "text-[#0A0A0A]/55 hover:text-[#0A0A0A]"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}