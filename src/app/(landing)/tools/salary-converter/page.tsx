import type { Metadata } from "next";
import { ToolShell, type RelatedTool } from "@/components/tools/tool-shell";
import { SalaryConverter } from "@/components/tools/salary-converter";

export const metadata: Metadata = {
  title: "Hourly to Salary Converter",
  description:
    "Convert an hourly freelance rate to an annual salary or back, tuned to your real billable hours per year. Free and instant.",
};

const related: RelatedTool[] = [
  {
    title: "Upwork Rate Calculator",
    description: "Turn an hourly rate into real monthly and yearly income.",
    href: "/tools/rate-calculator",
  },
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
];

export default function SalaryConverterPage() {
  return (
    <ToolShell
      eyebrow="Benchmark"
      title="Hourly to Salary Converter"
      description="Wondering what your hourly rate is worth as a full-time salary — or the other way around? Choose your direction, adjust your billable hours and weeks, and get an honest comparison."
      related={related}
    >
      <SalaryConverter />
    </ToolShell>
  );
}