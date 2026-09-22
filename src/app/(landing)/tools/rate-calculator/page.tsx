import type { Metadata } from "next";
import { ToolShell, type RelatedTool } from "@/components/tools/tool-shell";
import { RateCalculator } from "@/components/tools/rate-calculator";

export const metadata: Metadata = {
  title: "Upwork Rate Calculator",
  description:
    "Find your real take-home pay and effective hourly rate after Upwork service fees and business costs. Free, no sign-up.",
};

const related: RelatedTool[] = [
  {
    title: "Upwork Fee Calculator",
    description: "See what you keep from a fixed or hourly contract after fees.",
    href: "/tools/fee-calculator",
  },
  {
    title: "Freelance Rate Planner",
    description: "Work backwards from your income goal to the rate you need.",
    href: "/tools/budget-planner",
  },
  {
    title: "Hourly ⇄ Salary Converter",
    description: "Benchmark your rate against full-time salaries.",
    href: "/tools/salary-converter",
  },
];

export default function RateCalculatorPage() {
  return (
    <ToolShell
      eyebrow="Earnings"
      title="Upwork Rate Calculator"
      description="Enter your hourly rate, the hours you really bill, and your costs. We'll show the numbers that matter: monthly and yearly take-home, the Upwork fee cut, and your true effective hourly rate."
      related={related}
    >
      <RateCalculator />
    </ToolShell>
  );
}