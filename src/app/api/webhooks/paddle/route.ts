import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import {
  upsertSubscription,
  cancelSubscription,
} from "@/lib/subscription-server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET ?? "";

function verifySignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  if (!WEBHOOK_SECRET || !signatureHeader) {
    console.error("[Paddle WH] Missing secret or signature:", {
      hasSecret: !!WEBHOOK_SECRET,
      hasSig: !!signatureHeader,
    });
    return false;
  }

  let ts = "";
  let h1 = "";
  for (const part of signatureHeader.split(";")) {
    const [key, value] = part.split("=");
    if (key === "ts") ts = value;
    if (key === "h1") h1 = value;
  }

  if (!ts || !h1) {
    console.error("[Paddle WH] Invalid signature format:", signatureHeader);
    return false;
  }

  const signedPayload = `${ts}:${rawBody}`;
  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(signedPayload, "utf8")
    .digest("hex");

  const a = Buffer.from(h1);
  const b = Buffer.from(expected);
  const valid = a.length === b.length && timingSafeEqual(a, b);

  if (!valid) {
    console.error("[Paddle WH] Signature mismatch:", { ts, h1Preview: h1.slice(0, 16), expectedPreview: expected.slice(0, 16) });
  }

  return valid;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();

  console.log("[Paddle WH] Received event, signature:", signature ? "present" : "missing");

  if (!verifySignature(rawBody, signature)) {
    return Response.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const eventType = event.event_type as string;
  const data = event.data as any;

  console.log("[Paddle WH] Event type:", eventType, "custom_data:", JSON.stringify(data?.custom_data));

  try {
    switch (eventType) {
      case "transaction.completed": {
        const userId = data.custom_data?.user_id;
        if (!userId) {
          console.error("[Paddle WH] transaction.completed missing user_id, custom_data:", data?.custom_data);
          break;
        }

        const subscriptionId = data.subscription_id ?? data.id ?? "";
        const priceId = data.items?.[0]?.price?.id ?? "";
        const periodEnd =
          data.next_transaction?.effective_at ??
          data.billing_period?.ends_at ??
          null;

        console.log("[Paddle WH] Activating subscription:", { userId, subscriptionId, priceId });
        await upsertSubscription(userId, subscriptionId, priceId, "active", periodEnd);
        console.log("[Paddle WH] Subscription activated for:", userId);

        // Record affiliate commission if user was referred
        try {
          await recordAffiliateCommission(userId, data);
        } catch (e) {
          console.error("[Paddle WH] Failed to record affiliate commission:", e);
        }
        break;
      }

      case "subscription.created":
      case "subscription.updated": {
        const userId = data.custom_data?.user_id;
        if (!userId) {
          console.error("[Paddle WH]", eventType, "missing user_id, custom_data:", data?.custom_data);
          break;
        }

        const status = data.status === "active" ? "active"
          : data.status === "past_due" ? "past_due"
          : data.status === "paused" ? "paused"
          : data.status === "canceled" ? "canceled"
          : "active";

        const periodEnd = data.current_billing_period?.ends_at ?? null;
        const planId = data.items?.[0]?.price?.id ?? "";

        console.log("[Paddle WH] Upserting subscription:", { userId, planId, status });
        await upsertSubscription(userId, data.id, planId, status, periodEnd);
        break;
      }

      case "subscription.canceled": {
        const userId = data.custom_data?.user_id;
        if (!userId) break;
        await cancelSubscription(userId);
        break;
      }

      case "subscription.past_due": {
        const userId = data.custom_data?.user_id;
        if (!userId) break;
        await upsertSubscription(
          userId,
          data.id,
          data.items?.[0]?.price?.id ?? "",
          "past_due",
          data.current_billing_period?.ends_at ?? null
        );
        break;
      }

      default:
        console.log("[Paddle WH] Unhandled event type:", eventType);
        break;
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("[Paddle WH] Processing error:", err);
    return Response.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Record affiliate commission when a referred user makes a payment.
 * Checks if the paying user has a referral_signups record, then creates a commission.
 */
async function recordAffiliateCommission(userId: string, transactionData: any) {
  const admin = createSupabaseAdminClient() as any;

  // Find the referral signup for this user
  const { data: referral } = await admin
    .from("referral_signups")
    .select("id, affiliate_id, referral_code")
    .eq("user_id", userId)
    .single();

  if (!referral) {
    // User wasn't referred — no commission to record
    return;
  }

  // Check if commission already recorded for this transaction (idempotency)
  const transactionId = transactionData.id ?? transactionData.subscription_id;
  const { data: existingCommission } = await admin
    .from("commissions")
    .select("id")
    .eq("referral_signup_id", referral.id)
    .eq("paddle_transaction_id", String(transactionId))
    .single();

  if (existingCommission) {
    console.log("[Paddle WH] Commission already recorded for transaction:", transactionId);
    return;
  }

  // Get affiliate details for commission rate
  const { data: affiliate } = await admin
    .from("affiliates")
    .select("id, commission_rate")
    .eq("id", referral.affiliate_id)
    .single();

  if (!affiliate) {
    return;
  }

  // Calculate commission amount
  // Paddle Billing v2: amounts are in smallest currency unit (cents)
  // total may be at data.total, data.details.totals.gross, or data.payments[0].amount
  const rawTotal = transactionData.total
    ?? transactionData.details?.totals?.gross
    ?? transactionData.payments?.[0]?.amount
    ?? 0;
  const totalAmount = parseFloat(String(rawTotal)) / 100;
  const commissionRate = parseFloat(affiliate.commission_rate ?? "20"); // Default 20%
  const commissionRateDecimal = commissionRate > 1 ? commissionRate / 100 : commissionRate;
  const commissionAmount = totalAmount * commissionRateDecimal;
  const plan = transactionData.subscription_id ? "subscription" : "one_time";

  console.log("[Paddle WH] Commission calc:", { rawTotal, totalAmount, commissionRate, commissionAmount });

  // Record the commission (column names match commissions table schema)
  await admin.from("commissions").insert({
    affiliate_id: referral.affiliate_id,
    referral_signup_id: referral.id,
    paddle_transaction_id: String(transactionId),
    customer_user_id: userId,
    plan: plan,
    sale_amount: totalAmount,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    status: "pending",
  });

  // Update referral signup status
  await admin
    .from("referral_signups")
    .update({ status: "paid" })
    .eq("id", referral.id);

  // Update affiliate earnings summary
  await admin.rpc("increment_affiliate_earnings", {
    p_affiliate_id: referral.affiliate_id,
    p_amount: commissionAmount,
  }).then(() => {}).catch(async () => {
    // Fallback: direct update if RPC doesn't exist
    const { data: aff } = await admin
      .from("affiliates")
      .select("total_earned, pending_commission")
      .eq("id", referral.affiliate_id)
      .single();
    if (aff) {
      await admin
        .from("affiliates")
        .update({
          total_earned: (aff.total_earned ?? 0) + commissionAmount,
          pending_commission: (aff.pending_commission ?? 0) + commissionAmount,
          total_conversions: ((aff as any).total_conversions ?? 0) + 1,
        })
        .eq("id", referral.affiliate_id);
    }
  });

  console.log("[Paddle WH] Commission recorded:", {
    affiliate_id: referral.affiliate_id,
    amount: commissionAmount,
    transaction_id: transactionId,
  });
}
