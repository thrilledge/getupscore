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
  if (!WEBHOOK_SECRET || !signatureHeader) return false;

  let ts = "";
  let h1 = "";
  for (const part of signatureHeader.split(";")) {
    const [key, value] = part.split("=");
    if (key === "ts") ts = value;
    if (key === "h1") h1 = value;
  }

  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(signedPayload, "utf8")
    .digest("hex");

  const a = Buffer.from(h1);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();

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

  try {
    switch (eventType) {
      case "subscription.created":
      case "subscription.updated": {
        const userId = data.custom_data?.user_id;
        if (!userId) break;

        const status = data.status === "active" ? "active"
          : data.status === "past_due" ? "past_due"
          : data.status === "paused" ? "paused"
          : data.status === "canceled" ? "canceled"
          : "active";

        const periodEnd =
          data.current_billing_period?.ends_at ?? null;

        const planId =
          data.items?.[0]?.price?.id ?? "";

        await upsertSubscription(
          userId,
          data.id,
          planId,
          status,
          periodEnd
        );
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
        break;
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("Paddle webhook error:", err);
    return Response.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
