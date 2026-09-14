import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveUserIdFromBearer } from "@/lib/supabase/verify-bearer";
import { getBillingDetails } from "@/lib/subscription-server";
import { resumePaddleSubscription } from "@/lib/paddle-api";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  let userId: string | null = null;

  if (authHeader.startsWith("Bearer ")) {
    userId = await resolveUserIdFromBearer(authHeader.slice(7).trim());
  } else {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (!error && user) userId = user.id;
  }

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBillingDetails(userId);
  if (!billing?.paddle_subscription_id) {
    return Response.json({ error: "No active subscription" }, { status: 400 });
  }

  const subscription = await resumePaddleSubscription(
    billing.paddle_subscription_id
  );

  if (!subscription) {
    return Response.json({ error: "Failed to resume subscription" }, { status: 502 });
  }

  return Response.json({
    data: {
      status: subscription.status,
      scheduled_change: subscription.scheduled_change,
    },
  });
}