"use client";

import { useMemo, useState } from "react";
import {
  Field,
  fmtCurrency,
  fmtNumber,
  ResultItem,
  ToolCard,
} from "@/components/tools/tool-ui";

export function BudgetPlanner() {
  const [takeHome, setTakeHome] = useState("5000");
  const [costs, setCosts] = useState("600");
  const [savings, setSavings] = useState("1000");
  const [hoursPerWeek, setHoursPerWeek] = useState("30");
  const [feePercent, setFeePercent] = useState("10");

  const result = useMemo(() => {
    const wanted = parseFloat(takeHome) || 0;
    const expenses = parseFloat(costs) || 0;
    const save = parseFloat(savings) || 0;
    const hours = parseFloat(hoursPerWeek) || 0;
    const fee = Math.min(100, Math.max(0, parseFloat(feePercent) || 0)) / 100;

    // Gross must cover: (take-home + costs + savings) + fee on the whole gross.
    const neededAfterFee = wanted + expenses + save;
    const grossMonthly = fee >= 1 ? 0 : neededAfterFee / (1 - fee);
    const billableMonthly = (hours * 52) / 12;
    const hourlyRate = billableMonthly > 0 ? grossMonthly / billableMonthly : 0;

    // Round up to a market-friendly number ($5/$10 steps).
    const roundedRate = hourlyRate > 0 ? Math.ceil(hourlyRate / 5) * 5 : 0;

    return {
      grossMonthly,
      hourlyRate,
      roundedRate,
      billableMonthly,
      feeAmount: grossMonthly * fee,
    };
  }, [takeHome, costs, savings, hoursPerWeek, feePercent]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <ToolCard
        title="What do you need?"
        subtitle="Work backwards from your financial target to a billable rate."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Target take-home / month"
            prefix="$"
            type="number"
            inputMode="decimal"
            value={takeHome}
            onChange={(e) => setTakeHome(e.target.value)}
          />
          <Field
            label="Monthly business costs"
            hint="tools, ads, software"
            prefix="$"
            type="number"
            inputMode="decimal"
            value={costs}
            onChange={(e) => setCosts(e.target.value)}
          />
          <Field
            label="Savings target / month"
            prefix="$"
            type="number"
            inputMode="decimal"
            value={savings}
            onChange={(e) => setSavings(e.target.value)}
          />
          <Field
            label="Billable hours / week"
            type="number"
            inputMode="decimal"
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(e.target.value)}
          />
          <Field
            label="Upwork service fee"
            suffix="%"
            type="number"
            inputMode="decimal"
            className="sm:col-span-2"
            value={feePercent}
            onChange={(e) => setFeePercent(e.target.value)}
          />
        </div>
      </ToolCard>

      <div className="grid content-start gap-3 sm:grid-cols-2">
        <ResultItem
          accent
          label="Charge this rate"
          value={`${fmtCurrency(result.roundedRate)}/hr`}
          helper={`Exactly ${fmtCurrency(result.hourlyRate)}/hr raw, rounded up to a clean number.`}
        />
        <ResultItem
          label="Gross you must bill"
          value={fmtCurrency(result.grossMonthly)}
          helper={`/month before the ${feePercent || 0}% Upwork fee.`}
        />
        <ResultItem
          label="Fee you'll pay"
          value={`-${fmtCurrency(result.feeAmount)}/mo`}
          helper={`~${fmtNumber(result.billableMonthly, 1)} billable hours per month.`}
        />
        <ResultItem
          label="For a fixed-price job"
          value={`${fmtCurrency(result.grossMonthly * 2)} / ${fmtCurrency(result.grossMonthly * 3)}`}
          helper="Rough range for a 2–3 month project at this rate."
        />
      </div>
    </div>
  );
}