/**
 * Server-only Paddle Billing API client.
 * All amounts are converted from Paddle's smallest-currency-unit (cents)
 * into dollars for display.
 */

export const PADDLE_BASE_URL =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

const PADDLE_SERVER_KEY = process.env.PADDLE_API_KEY ?? "";

async function paddleFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${PADDLE_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${PADDLE_SERVER_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paddle API error ${res.status}: ${body.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}

export type PaddleSubscription = {
  id: string;
  status: string;
  customer_id: string | null;
  current_billing_period: { starts_at: string; ends_at: string } | null;
  scheduled_change: { action: string; effective_at: string } | null;
  items?: {
    price?: {
      id: string;
      unit_price?: { amount: string; currency_code: string };
      billing_cycle?: { interval: string };
    };
    quantity?: number;
  }[];
};

export type PaddleCard = {
  id: string;
  type: "card";
  card: {
    cardholder_name: string;
    type: string;
    last4: string;
    expiry_month: number;
    expiry_year: number;
  };
  created_at: string;
};

export type PaddlePayPal = {
  id: string;
  type: "paypal";
  paypal: { email: string };
  created_at: string;
};

export type PaddlePaymentMethod = PaddleCard | PaddlePayPal;

export type PaddleTransaction = {
  id: string;
  status: string;
  invoice_number: string | null;
  currency_code: string;
  billed_at: string | null;
  created_at: string | null;
  invoice_id: string | null;
  details?: {
    totals?: { grand_total?: string; total?: string };
  };
  invoices?: { url?: string }[];
};

export type PaddleInvoice = {
  id: string;
  number: string;
  status: string;
  amount: number;
  currency_code: string;
  billed_at: string | null;
  pdf_url: string | null;
};

export function centsToDollars(cents: string | number | null | undefined): number {
  const value = parseFloat(String(cents ?? "0"));
  return isNaN(value) ? 0 : value / 100;
}

export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export async function getPaddleSubscription(
  subscriptionId: string
): Promise<PaddleSubscription | null> {
  try {
    const res = await paddleFetch<{ data: PaddleSubscription }>(
      `/subscriptions/${subscriptionId}`
    );
    return res.data;
  } catch (err) {
    console.error("[paddle-api] getSubscription failed:", err);
    return null;
  }
}

/** Cancel at the end of the current billing period (Paddle default). */
export async function cancelPaddleSubscription(
  subscriptionId: string
): Promise<PaddleSubscription | null> {
  try {
    const res = await paddleFetch<{ data: PaddleSubscription }>(
      `/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ effective_from: "next_billing_period" }),
      }
    );
    return res.data;
  } catch (err) {
    console.error("[paddle-api] cancelSubscription failed:", err);
    return null;
  }
}

/** Remove a scheduled cancellation (resume). */
export async function resumePaddleSubscription(
  subscriptionId: string
): Promise<PaddleSubscription | null> {
  try {
    const res = await paddleFetch<{ data: PaddleSubscription }>(
      `/subscriptions/${subscriptionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ scheduled_change: null }),
      }
    );
    return res.data;
  } catch (err) {
    console.error("[paddle-api] resumeSubscription failed:", err);
    return null;
  }
}

export async function listPaddlePaymentMethods(
  customerId: string
): Promise<PaddlePaymentMethod[]> {
  const res = await paddleFetch<{ data: PaddlePaymentMethod[] }>(
    `/customers/${customerId}/payment-methods`
  );
  return res.data;
}

export async function listPaddleTransactions(
  subscriptionId: string
): Promise<PaddleInvoice[]> {
  const res = await paddleFetch<{ data: PaddleTransaction[] }>(
    `/transactions?subscription_id=${subscriptionId}`
  );

  return res.data
    .filter((tx) => tx.status === "completed" || tx.status === "billed")
    .sort(
      (a, b) =>
        new Date(b.billed_at ?? b.created_at ?? 0).getTime() -
        new Date(a.billed_at ?? a.created_at ?? 0).getTime()
    )
    .slice(0, 20)
    .map((tx) => ({
      id: tx.id,
      number:
        tx.invoice_number ??
        tx.invoice_id ??
        tx.id.slice(-8).toUpperCase(),
      status: tx.status,
      amount: centsToDollars(tx.details?.totals?.grand_total ?? tx.details?.totals?.total),
      currency_code: tx.currency_code,
      billed_at: tx.billed_at ?? tx.created_at,
      pdf_url: tx.invoices?.[0]?.url ?? null,
    }));
}

export type PaddlePortalUrls = {
  overview: string | null;
  cancel_subscription: string | null;
  update_payment_method: string | null;
};

export async function createPaddlePortalUrls(
  customerId: string,
  subscriptionId: string
): Promise<PaddlePortalUrls> {
  const res = await paddleFetch<{
    data: {
      urls: {
        general?: { overview?: string };
        subscriptions?: {
          id: string;
          cancel_subscription?: string;
          update_subscription_payment_method?: string;
        }[];
      };
    };
  }>(`/customers/${customerId}/portal-sessions`, {
    method: "POST",
    body: JSON.stringify({ subscription_ids: [subscriptionId] }),
  });

  const sub = res.data.urls.subscriptions?.[0];
  return {
    overview: res.data.urls.general?.overview ?? null,
    cancel_subscription: sub?.cancel_subscription ?? null,
    update_payment_method: sub?.update_subscription_payment_method ?? null,
  };
}