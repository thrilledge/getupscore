import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SubscriptionInfo } from "./subscription";

export async function getSubscription(
  userId: string
): Promise<SubscriptionInfo> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.rpc("check_subscription", {
    p_user_id: userId,
  });

  if (!data) {
    return { plan: "free", status: "free", is_paid: false };
  }

  return data as unknown as SubscriptionInfo;
}

export type BillingDetails = {
  paddle_subscription_id: string | null;
  paddle_plan_id: string | null;
  paddle_customer_id: string | null;
  status: string | null;
  current_period_end: string | null;
};

export async function upsertSubscription(
  userId: string,
  paddleSubscriptionId: string,
  paddlePlanId: string,
  status: string,
  currentPeriodEnd: string | null,
  paddleCustomerId?: string | null
) {
  const supabase = createSupabaseAdminClient();
  await supabase.rpc("upsert_subscription", {
    p_user_id: userId,
    p_paddle_subscription_id: paddleSubscriptionId,
    p_paddle_plan_id: paddlePlanId,
    p_status: status,
    p_current_period_end: currentPeriodEnd,
    p_paddle_customer_id: paddleCustomerId ?? null,
  });
}

/** Full Paddle-facing row (raw ids/status) for billing features. */
export async function getBillingDetails(
  userId: string
): Promise<BillingDetails | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.rpc("get_billing_details", {
    p_user_id: userId,
  });

  if (!data) return null;
  return data as unknown as BillingDetails;
}

export async function cancelSubscription(userId: string) {
  const supabase = createSupabaseAdminClient();
  await supabase.rpc("cancel_subscription", {
    p_user_id: userId,
  });
}
