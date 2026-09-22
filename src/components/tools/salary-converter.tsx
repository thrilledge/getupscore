"use client";

import { useMemo, useState } from "react";
import {
  Field,
  fmtCurrency,
  ResultItem,
  SegmentedControl,
  ToolCard,
} from "@/components/tools/tool-ui";

type Mode = "hourly-to-salary" | "salary-to-hourly";

export function SalaryConverter() {
  const [mode, setMode] = useState<Mode>("hourly-to-salary");
  const [hourlyRate, setHourlyRate] = useState("50");
  const [salary, setSalary] = useState("96000");
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [weeksPerYear, setWeeksPerYear] = useState("48");

  const output = useMemo(() => {
    const hours = parseFloat(hoursPerWeek) || 0;
    const weeks = parseFloat(weeksPerYear) || 0;
    const totalHours = hours * weeks;

    let annual: number;
    let hourly: number;

    if (mode === "hourly-to-salary") {
      hourly = parseFloat(hourlyRate) || 0;
      annual = hourly * totalHours;
    } else {
      annual = parseFloat(salary) || 0;
      hourly = totalHours > 0 ? annual / totalHours : 0;
    }

    const monthly = annual / 12;
    const weekly = hours > 0 && weeks > 0 ? annual / weeks : 0;
    const daily = hours > 0 ? (annual / weeks / hours) * 8 : 0;

    return { annual, hourly, monthly, weekly, daily, totalHours };
  }, [mode, hourlyRate, salary, hoursPerWeek, weeksPerYear]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <ToolCard
        title="Hourly ⇄ salary"
        subtitle="Convert between hourly rates and annual salaries."
      >
        <div className="grid gap-4">
          <SegmentedControl
            label="Conversion direction"
            options={[
              { value: "hourly-to-salary", label: "Hourly → Salary" },
              { value: "salary-to-hourly", label: "Salary → Hourly" },
            ]}
            value={mode}
            onChange={setMode}
          />

          {mode === "hourly-to-salary" ? (
            <Field
              label="Hourly rate"
              prefix="$"
              type="number"
              inputMode="decimal"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          ) : (
            <Field
              label="Annual salary (gross)"
              prefix="$"
              type="number"
              inputMode="decimal"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Billable hours / week"
              type="number"
              inputMode="decimal"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(e.target.value)}
            />
            <Field
              label="Weeks / year"
              hint="exclude time off"
              type="number"
              inputMode="decimal"
              value={weeksPerYear}
              onChange={(e) => setWeeksPerYear(e.target.value)}
            />
          </div>
        </div>
      </ToolCard>

      <div className="grid content-start gap-3 sm:grid-cols-2">
        <ResultItem
          accent
          label={mode === "hourly-to-salary" ? "Equivalent annual salary" : "Equivalent hourly rate"}
          value={
            mode === "hourly-to-salary"
              ? fmtCurrency(output.annual)
              : `${fmtCurrency(output.hourly)}/hr`
          }
          helper={`Based on ${fmtCurrency(output.totalHours, 0) || "—"} billable hours / year.`}
        />
        <ResultItem
          label="Monthly"
          value={fmtCurrency(output.monthly)}
          helper="Annual ÷ 12, paid evenly."
        />
        <ResultItem
          label="Weekly"
          value={fmtCurrency(output.weekly)}
          helper={`Across ${fmtNumber(parseFloat(weeksPerYear) || 0)} paid weeks.`}
        />
        <ResultItem
          label="Per 8-hr day"
          value={fmtCurrency(output.daily)}
          helper="Rough daily rate for scope estimates."
        />
      </div>
    </div>
  );
}

function fmtNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}