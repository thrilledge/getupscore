"use client";

import { useMemo, useState } from "react";
import {
  Field,
  fmtCurrency,
  fmtNumber,
  ResultItem,
  ToolCard,
} from "@/components/tools/tool-ui";

export function RateCalculator() {
  const [rate, setRate] = useState("45");
  const [hoursPerWeek, setHoursPerWeek] = useState("30");
  const [weeksPerYear, setWeeksPerYear] = useState("48");
  const [feePercent, setFeePercent] = useState("10");
  const [monthlyCosts, setMonthlyCosts] = useState("200");

  const result = useMemo(() => {
    const hourlyRate = parseFloat(rate) || 0;
    const hours = parseFloat(hoursPerWeek) || 0;
    const weeks = parseFloat(weeksPerYear) || 0;
    const fee = Math.min(100, Math.max(0, parseFloat(feePercent) || 0)) / 100;
    const costs = parseFloat(monthlyCosts) || 0;

    const totalHoursPerYear = hours * weeks;
    const grossMonthly = (hourlyRate * totalHoursPerYear) / 12;
    const grossYearly = hourlyRate * totalHoursPerYear;
    const feeMonthly = grossMonthly * fee;
    const takeHomeMonthly = grossMonthly - feeMonthly - costs;
    const takeHomeYearly = takeHomeMonthly * 12;
    const effectiveHourly =
      totalHoursPerYear > 0 ? takeHomeYearly / totalHoursPerYear : 0;

    return {
      grossMonthly,
      feeMonthly,
      takeHomeMonthly,
      takeHomeYearly,
      effectiveHourly,
      feePerThousand: fee * 1000,
    };
  }, [rate, hoursPerWeek, weeksPerYear, feePercent, monthlyCosts]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <ToolCard
        title="Your earnings"
        subtitle="Fill in what you charge and how much you actually work."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Hourly rate"
            prefix="$"
            type="number"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <Field
            label="Billable hours / week"
            type="number"
            inputMode="decimal"
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(e.target.value)}
          />
          <Field
            label="Weeks worked / year"
            hint="exclude holidays"
            type="number"
            inputMode="decimal"
            value={weeksPerYear}
            onChange={(e) => setWeeksPerYear(e.target.value)}
          />
          <Field
            label="Upwork service fee"
            suffix="%"
            type="number"
            inputMode="decimal"
            value={feePercent}
            onChange={(e) => setFeePercent(e.target.value)}
          />
          <Field
            label="Monthly business costs"
            hint="subscriptions, ads…"
            prefix="$"
            type="number"
            inputMode="decimal"
            className="sm:col-span-2"
            value={monthlyCosts}
            onChange={(e) => setMonthlyCosts(e.target.value)}
          />
        </div>
      </ToolCard>

      <div className="grid content-start gap-3 sm:grid-cols-2">
        <ResultItem
          accent
          label="Yearly take-home"
          value={fmtCurrency(result.takeHomeYearly)}
          helper={`After a ${feePercent || 0}% Upwork fee and ${fmtCurrency(result.feePerThousand, 0)} per $1,000 dropped on costs.`}
        />
        <ResultItem
          label="Monthly take-home"
          value={fmtCurrency(result.takeHomeMonthly)}
          helper={`~${fmtNumber(result.grossMonthly, 0)} gross minus ${fmtCurrency(result.feeMonthly, 0)} in fees.`}
        />
        <ResultItem
          label="Gross earnings / yr"
          value={fmtCurrency(result.grossMonthly * 12)}
          helper="What the client-wide bill adds up to before fees."
        />
        <ResultItem
          label="Effective hourly rate"
          value={fmtCurrency(result.effectiveHourly)}
          helper="Your real per-hour pay after fees and costs."
        />
      </div>
    </div>
  );
}