export type SubscriptionPlan = "free" | "pro";
export type SubscriptionStatus = "free" | "active" | "canceled" | "past_due" | "paused";

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  is_paid: boolean;
  current_period_end?: string;
}

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "Dashboard overview",
      "Job filters (save up to 2)",
      "Saved jobs",
      "Settings & profile",
    ],
  },
  pro: {
    name: "Pro",
    price: 12,
    interval: "month",
    features: [
      "Everything in Free",
      "Full jobs dashboard",
      "AI job analysis",
      "Unlimited proposals",
      "Market trends",
      "Extension API access",
      "Unlimited filters",
    ],
  },
} as const;
