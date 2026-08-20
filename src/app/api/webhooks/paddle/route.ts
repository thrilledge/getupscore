import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import {
  upsertSubscription,
  cancelSubscription,
} from "@/lib/subscription-server";

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
