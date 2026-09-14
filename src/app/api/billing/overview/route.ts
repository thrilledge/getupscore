import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveUserIdFromBearer } from "@/lib/supabase/verify-bearer";
import { getBillingDetails } from "@/lib/subscription-server";
import {
  getPaddleSubscription,
  listPaddlePaymentMethods,
  listPaddleTransactions,
  createPaddlePortalUrls,
  centsToDollars,
  formatMoney,
} from "@/lib/paddle-api";

export async function GET(request: Request) {
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
    return Response.json({ data: { subscription: null } });
  }

  const subId = billing.paddle_subscription_id;
  const customerId = billing.paddle_customer_id;

  const [subscription, paymentMethods, invoices, portalUrls] =
    await Promise.all([
      getPaddleSubscription(subId),
      customerId ? listPaddlePaymentMethods(customerId) : Promise.resolve([]),
      listPaddleTransactions(subId),
      customerId && subId
        ? createPaddlePortalUrls(customerId, subId).catch(() => null)
        : Promise.resolve(null),
    ]);

  const periodEnd =
    subscription?.current_billing_period?.ends_at ?? billing.current_period_end;
  const price = centsToDollars(
    subscription?.items?.[0]?.price?.unit_price?.amount
  );
  const planId =
    subscription?.items?.[0]?.price?.id ?? billing.paddle_plan_id;
  const interval = subscription?.items?.[0]?.price?.billing_cycle?.interval;
  const isYearly = interval === "year";
  const yearlyPrice = price ? price * 12 : 130;

  return Response.json({
    data: {
      subscription: {
        id: subId,
        status: subscription?.status ?? billing.status ?? "unknown",
        plan_id: planId,
        plan: billing.status === "free" ? "free" : "pro",
        is_paid: billing.status !== "free",
        price: price || (isYearly ? 10.83 : 12),
        price_label: price
          ? formatMoney(isYearly ? yearlyPrice : price)
          : isYearly
            ? "$129.96/yr"
            : "$12/mo",
        billing_cycle: isYearly ? "yearly" : "monthly",
        current_period_end: periodEnd,
        scheduled_change: subscription?.scheduled_change
          ? {
              action: subscription.scheduled_change.action,
              effective_at: subscription.scheduled_change.effective_at,
            }
          : null,
      },
      payment_methods: paymentMethods.map((pm) =>
        pm.type === "card"
          ? {
              id: pm.id,
              type: "card",
              brand: pm.card.type ?? "card",
              last4: pm.card.last4,
              expiry_month: pm.card.expiry_month,
              expiry_year: pm.card.expiry_year,
              cardholder_name: pm.card.cardholder_name,
            }
          : {
              id: pm.id,
              type: "paypal",
              email: pm.paypal.email,
            }
      ),
      invoices,
      portal: portalUrls,
    },
  });
}