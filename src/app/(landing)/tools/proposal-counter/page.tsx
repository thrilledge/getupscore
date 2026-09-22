import type { Metadata } from "next";
import { ToolShell, type RelatedTool } from "@/components/tools/tool-shell";
import { ProposalCounter } from "@/components/tools/proposal-counter";

export const metadata: Metadata = {
  title: "Proposal Character Counter",
  description:
    "Live character and word count for your Upwork cover letter, with the 5,000-character limit and a reading-time estimate. Free, no sign-up.",
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

export default function ProposalCounterPage() {
  return (
    <ToolShell
      eyebrow="Proposals"
      title="Proposal Character Counter"
      description="Upwork's cover-letter box has a hard 5,000-character limit. Paste or type your proposal here and see exactly where you stand — characters, words, sentences and estimated reading time, updated live."
      related={related}
    >
      <ProposalCounter />
    </ToolShell>
  );
}