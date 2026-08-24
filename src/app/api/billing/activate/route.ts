import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { upsertSubscription } from "@/lib/subscription-server";

const PADDLE_API_BASE = process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
  ? "https://api.paddle.com"
  : "https://sandbox-api.paddle.com";

const PADDLE_SERVER_KEY = process.env.PADDLE_API_KEY ?? "";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transactionId } = await request.json();

    if (!transactionId) {
      return Response.json({ error: "transactionId required" }, { status: 400 });
    }

    console.log("[Billing] Verifying transaction:", transactionId, "for user:", user.id);

    const res = await fetch(`${PADDLE_API_BASE}/transactions/${transactionId}`, {
      headers: {
        Authorization: `Bearer ${PADDLE_SERVER_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[Billing] Paddle API error:", res.status, body);
      return Response.json({ error: "Failed to verify transaction" }, { status: 502 });
    }

    const json = await res.json();
    const tx = json?.data;

    if (!tx) {
      return Response.json({ error: "Transaction not found" }, { status: 400 });
    }

    const status = ["completed", "approved", "paid"].includes(tx.status) ? "active" : tx.status;
    const subscriptionId = tx.subscription_id ?? tx.id ?? "";
    const priceId = tx.items?.[0]?.price?.id ?? "";
    const periodEnd =
      tx.next_transaction?.effective_at ??
      tx.billing_period?.ends_at ??
      null;

    console.log("[Billing] Activating:", { subscriptionId, priceId, status, periodEnd });

    await upsertSubscription(user.id, subscriptionId, priceId, status, periodEnd);

    return Response.json({ success: true });
  } catch (err) {
    console.error("[Billing] activate error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
