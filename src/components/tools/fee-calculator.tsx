"use client";

import { useMemo, useState } from "react";
import {
  Field,
  fmtCurrency,
  fmtNumber,
  SegmentedControl,
  ToolCard,
  ResultItem,
} from "@/components/tools/tool-ui";

type Engagement = "fixed" | "hourly";

export function FeeCalculator() {
  const [engagement, setEngagement] = useState<Engagement>("fixed");
  const [fixedAmount, setFixedAmount] = useState("2500");
  const [hourlyRate, setHourlyRate] = useState("40");
  const [hours, setHours] = useState("80");
  const [feePercent, setFeePercent] = useState("10");

  const result = useMemo(() => {
    const gross =
      engagement === "fixed"
        ? parseFloat(fixedAmount) || 0
        : (parseFloat(hourlyRate) || 0) * (parseFloat(hours) || 0);
    const fee = Math.min(100, Math.max(0, parseFloat(feePercent) || 0)) / 100;
    const feeAmount = gross * fee;
    const takeHome = gross - feeAmount;

    return {
      gross,
      feeAmount,
      takeHome,
      feePercent: fee * 100,
      keepPerThousand: gross > 0 ? (takeHome / gross) * 1000 : 0,
    };
  }, [engagement, fixedAmount, hourlyRate, hours, feePercent]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <ToolCard
        title="Contract amount"
        subtitle="See exactly what lands in your pocket after Upwork's fee."
      >
        <div className="grid gap-4">
          <SegmentedControl
            label="Engagement type"
            options={[
              { value: "fixed", label: "Fixed price" },
              { value: "hourly", label: "Hourly" },
            ]}
            value={engagement}
            onChange={setEngagement}
          />

          {engagement === "fixed" ? (
            <Field
              label="Fixed project amount"
              prefix="$"
              type="number"
              inputMode="decimal"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Hourly rate"
                prefix="$"
                type="number"
                inputMode="decimal"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
              <Field
                label="Hours"
                hint="on this contract"
                type="number"
                inputMode="decimal"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
          )}

          <Field
            label="Upwork service fee"
            suffix="%"
            type="number"
            inputMode="decimal"
            value={feePercent}
            onChange={(e) => setFeePercent(e.target.value)}
          />
        </div>
      </ToolCard>

      <div className="grid content-start gap-3 sm:grid-cols-2">
        <ResultItem
          accent
          label="You receive"
          value={fmtCurrency(result.takeHome)}
          helper={`Keep ${fmtCurrency(result.keepPerThousand, 0)} of every $1,000 billed.`}
        />
        <ResultItem
          label="Gross amount"
          value={fmtCurrency(result.gross)}
          helper={
            engagement === "fixed"
              ? "The fixed-price invoice total."
              : `${fmtNumber(parseFloat(hours) || 0)} hrs × ${fmtCurrency(parseFloat(hourlyRate) || 0, 2).replace("$", "$")}/hr.`
          }
        />
        <ResultItem
          label="Upwork fee"
          value={`-${fmtCurrency(result.feeAmount)}`}
          helper={`At a ${fmtNumber(result.feePercent, 0)}% service fee.`}
        />
        <ResultItem
          label="Fee as % of amount"
          value={`${fmtNumber(result.feePercent, 1)}%`}
          helper="Upwork's flat rate is 10% on all contracts."
        />
      </div>
    </div>
  );
}