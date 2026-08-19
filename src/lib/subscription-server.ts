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

export async function upsertSubscription(
  userId: string,
  paddleSubscriptionId: string,
  paddlePlanId: string,
  status: string,
  currentPeriodEnd: string | null
) {
  const supabase = createSupabaseAdminClient();
  await supabase.rpc("upsert_subscription", {
    p_user_id: userId,
    p_paddle_subscription_id: paddleSubscriptionId,
    p_paddle_plan_id: paddlePlanId,
    p_status: status,
    p_current_period_end: currentPeriodEnd,
  });
}

export async function cancelSubscription(userId: string) {
  const supabase = createSupabaseAdminClient();
  await supabase.rpc("cancel_subscription", {
    p_user_id: userId,
  });
}
