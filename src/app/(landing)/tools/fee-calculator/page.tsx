import type { Metadata } from "next";
import { ToolShell, type RelatedTool } from "@/components/tools/tool-shell";
import { FeeCalculator } from "@/components/tools/fee-calculator";

export const metadata: Metadata = {
  title: "Upwork Fee Calculator",
  description:
    "Calculate exactly what you take home from a fixed-price or hourly Upwork contract after the service fee. Free and instant.",
};

const related: RelatedTool[] = [
  {
    title: "Upwork Rate Calculator",
    description: "Turn an hourly rate into real monthly and yearly income.",
    href: "/tools/rate-calculator",
  },
  {
    title: "Freelance Rate Planner",
    description: "Work backwards from your income goal to the rate you need.",
    href: "/tools/budget-planner",
  },
  {
    title: "Proposal Character Counter",
    description: "Keep every cover letter within Upwork's character limit.",
    href: "/tools/proposal-counter",
  },
];

export default function FeeCalculatorPage() {
  return (
    <ToolShell
      eyebrow="Take-home"
      title="Upwork Fee Calculator"
      description="Before you accept an offer, know the exact number that reaches your bank account. Enter a fixed-price or hourly contract and see the Upwork service fee and your net take-home."
      related={related}
    >
      <FeeCalculator />
    </ToolShell>
  );
}