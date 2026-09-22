import type { Metadata } from "next";
import { ToolShell, type RelatedTool } from "@/components/tools/tool-shell";
import { BudgetPlanner } from "@/components/tools/budget-planner";

export const metadata: Metadata = {
  title: "Freelance Rate Planner",
  description:
    "Work backwards from your desired income, costs and savings to the hourly rate you need to charge as a freelancer.",
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
    title: "Proposal Character Counter",
    description: "Keep every cover letter within Upwork's character limit.",
    href: "/tools/proposal-counter",
  },
];

export default function BudgetPlannerPage() {
  return (
    <ToolShell
      eyebrow="Pricing"
      title="Freelance Rate Planner"
      description="Start from the number that actually matters — the take-home income you need each month. Add your business costs and savings goals, and we'll work back to the hourly rate you should charge."
      related={related}
    >
      <BudgetPlanner />
    </ToolShell>
  );
}