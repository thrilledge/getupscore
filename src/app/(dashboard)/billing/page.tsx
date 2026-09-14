"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaddle, setCheckoutCompletedHandler } from "@/components/paddle-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  Zap,
  CreditCard,
  ExternalLink,
  Loader2,
  Crown,
  Clock,
  ArrowLeft,
  Sparkles,
  Tag,
  X,
  Download,
  Receipt,
  Wallet,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

type BillingPeriod = "monthly" | "yearly";

type OverviewData = {
  subscription: {
    id: string;
    status: string;
    plan: string;
    is_paid: boolean;
    price: number;
    price_label: string;
    billing_cycle: string;
    current_period_end: string | null;
    scheduled_change: { action: string; effective_at: string } | null;
  };
  payment_methods: {
    id: string;
    type: "card" | "paypal";
    brand?: string;
    last4?: string;
    expiry_month?: number;
    expiry_year?: number;
    cardholder_name?: string;
    email?: string;
  }[];
  invoices: {
    id: string;
    number: string;
    status: string;
    amount: number;
    currency_code: string;
    billed_at: string | null;
    pdf_url: string | null;
  }[];
  portal: {
    overview: string | null;
    cancel_subscription: string | null;
    update_payment_method: string | null;
  } | null;
};

type CouponResult = {
  valid: boolean;
  code?: string;
  coupon_id?: string;
  discount_type?: "percent" | "fixed";
  discount_value: number;
  error?: string;
};

type CheckoutCompleteData = {
  id?: string;
  transaction_id?: string;
};

type PaddleInstance = NonNullable<ReturnType<typeof usePaddle>>;
type CheckoutOptions = Parameters<PaddleInstance["Checkout"]["open"]>[0];

const PRO_FEATURES = [
  "Full jobs dashboard",
  "AI job analysis",
  "Unlimited proposals",
  "Market trends",
  "Extension API access",
  "Unlimited filters",
];

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  jcb: "JCB",
  diners: "Diners Club",
  unionpay: "UnionPay",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function BillingLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 pt-28">
      <div className="relative grid size-16 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-2xl border border-[#00C98B]/25" />

        <span className="absolute inset-1 animate-spin rounded-xl border-2 border-[#0A0A0A]/10 border-t-[#00C98B]" />

        <span className="size-2.5 rounded-full bg-[#00C98B] shadow-[0_0_15px_rgba(0,201,139,0.9)]" />
      </div>

      <p className="font-heading text-sm font-semibold text-muted-foreground">
        Billing details are loading…
      </p>
    </div>
  );
}

export default function BillingPage() {
  const { user, loading: userLoading } = useUser();
  const {
    subscription,
    loading: subLoading,
    refetch,
  } = useSubscription();
  const paddle = usePaddle();
  const router = useRouter();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const checkoutUserIdRef = useRef<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Overview (paid users)
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);

  const isPaid = subscription?.is_paid ?? false;
  const isLoading = userLoading || subLoading;

  const fetchOverview = useCallback(async () => {
    if (!isPaid) return;
    try {
      const res = await fetch("/api/billing/overview");
      if (!res.ok) return;
      const json = await res.json();
      setOverview(json.data);
    } catch {
      // ignore — page still shows upgrade/status from check_subscription
    }
  }, [isPaid]);

  useEffect(() => {
    Promise.resolve().then(() => void fetchOverview());
  }, [fetchOverview]);

  // Calculate discounted price
  const basePrice = period === "monthly" ? 12 : 130;
  let discountedPrice = basePrice;
  if (couponResult?.valid) {
    if (couponResult.discount_type === "percent") {
      discountedPrice = basePrice * (1 - couponResult.discount_value / 100);
    } else {
      discountedPrice = Math.max(0, basePrice - couponResult.discount_value);
    }
  }

  async function validateCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    setCouponResult(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), plan: period }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponResult(data);
        toast.success(`Coupon applied! ${data.discount_type === "percent" ? `${data.discount_value}% off` : `$${data.discount_value} off`}`);
      } else {
        setCouponError(data.error || "Invalid coupon");
      }
    } catch {
      setCouponError("Failed to validate coupon");
    }
    setCouponLoading(false);
  }

  function clearCoupon() {
    setCouponCode("");
    setCouponResult(null);
    setCouponError(null);
  }

  useEffect(() => {
    setCheckoutCompletedHandler(async (data: CheckoutCompleteData) => {
      const checkoutId = data?.id;
      const transactionId = data?.transaction_id;
      const userId = checkoutUserIdRef.current;
      if (!checkoutId || !userId) return;

      try {
        const res = await fetch("/api/billing/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkoutId, transactionId, userId }),
        });
        const json = await res.json();
        if (json?.success) {
          await refetch();
          setCheckoutLoading(false);
          toast.success("Welcome to Pro! All features unlocked.");
        } else {
          console.error("[Billing] activate failed:", json);
        }
      } catch (err) {
        console.error("[Billing] activate error:", err);
      }
    });
  }, [refetch]);

  const handleCheckout = useCallback(async () => {
    if (!user || !paddle) return;

    setCheckoutLoading(true);
    checkoutUserIdRef.current = user.id;

    const priceId =
      period === "monthly"
        ? process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID
        : process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID;

    try {
      const checkoutOptions: CheckoutOptions = {
        items: [
          {
            priceId: priceId as string,
            quantity: 1,
          },
        ],
        customData: {
          user_id: user.id,
          ...(couponResult?.valid ? { coupon_code: couponResult.code, coupon_id: couponResult.coupon_id } : {}),
        },
        settings: {
          displayMode: "overlay",
          theme: "light",
          locale: "en",
        },
      };

      // Apply discount via Paddle's discount code if coupon is valid
      if (couponResult?.valid && couponResult.code) {
        checkoutOptions.discountCode = couponResult.code;
      }

      paddle.Checkout.open(checkoutOptions);
    } catch {
      setCheckoutLoading(false);
      toast.error("Checkout failed. Please try again.");
    }
  }, [user, paddle, period, couponResult]);

  async function handleCancel() {
    setCancelDialogOpen(false);
    setResumeLoading(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.data) {
        await fetchOverview();
        toast.success("Subscription canceled. You keep access until the end of your billing period.");
      } else {
        toast.error(json?.error || "Failed to cancel subscription.");
      }
    } catch {
      toast.error("Failed to cancel subscription.");
    }
    setResumeLoading(false);
  }

  async function handleResume() {
    setResumeLoading(true);
    try {
      const res = await fetch("/api/billing/resume", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.data) {
        await fetchOverview();
        toast.success("Subscription resumed. You'll continue being billed as usual.");
      } else {
        toast.error(json?.error || "Failed to resume subscription.");
      }
    } catch {
      toast.error("Failed to resume subscription.");
    }
    setResumeLoading(false);
  }

  const sub = overview?.subscription;
  const overviewPaymentMethods = overview?.payment_methods ?? [];
  const overviewInvoices = overview?.invoices ?? [];
  const hasScheduledCancel = sub?.scheduled_change?.action === "cancel";
  const subStatus = sub?.status ?? subscription?.status ?? "active";
  const portalUpdateUrl = overview?.portal?.update_payment_method;
  const portalOverviewUrl = overview?.portal?.overview;

  if (isLoading) {
    return <BillingLoader />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      {/* Current Plan */}
      <Card className="overflow-hidden border-[#0A0A0A]/10">
        <div
          className={`h-1 ${isPaid ? "bg-gradient-to-r from-[#00C98B] to-[#00A975]" : "bg-[#0A0A0A]/20"}`}
        />

        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#0A0A0A]">
                {isPaid ? (
                  <Crown className="size-5 text-[#00C98B]" />
                ) : (
                  <CreditCard className="size-5 text-white/60" />
                )}
              </span>
              <div>
                <CardTitle className="font-heading text-lg">
                  {isPaid ? "Pro Plan" : "Free Plan"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isPaid
                    ? sub?.price_label ?? "You have full access to all features"
                    : "Upgrade to unlock jobs, proposals & more"}
                </CardDescription>
              </div>
            </div>

            {isPaid && sub ? (
              <Badge
                variant={subStatus === "past_due" ? "destructive" : subStatus === "canceled" ? "outline" : "default"}
                className={
                  subStatus === "active" || subStatus === "trialing"
                    ? "bg-[#00C98B]/10 text-[#00A975] hover:bg-[#00C98B]/20"
                    : subStatus === "past_due"
                      ? ""
                      : "text-muted-foreground"
                }
              >
                {hasScheduledCancel
                  ? "Cancels soon"
                  : subStatus === "past_due"
                    ? "Past due"
                    : subStatus === "paused"
                      ? "Paused"
                      : subStatus === "canceled"
                        ? "Canceled"
                        : "Active"}
              </Badge>
            ) : (
              <Badge variant={isPaid ? "default" : "secondary"} className={isPaid ? "bg-[#00C98B]/10 text-[#00A975] hover:bg-[#00C98B]/20" : ""}>
                {isPaid ? "Active" : "Free"}
              </Badge>
            )}
          </div>
        </CardHeader>

        {isPaid && (
          <CardContent className="space-y-3 pt-0">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              {sub?.current_period_end && (
                <div className="flex items-center gap-1.5">
                  <Clock className="size-4" />
                  Next billing: {formatDate(sub.current_period_end)}
                </div>
              )}
              {sub?.price_label && (
                <div className="flex items-center gap-1.5">
                  <Receipt className="size-4" />
                  {sub.price_label}
                </div>
              )}
              {sub?.billing_cycle && (
                <div className="flex items-center gap-1.5">
                  <Wallet className="size-4" />
                  {sub.billing_cycle === "yearly" ? "Billed yearly" : "Billed monthly"}
                </div>
              )}
            </div>

            {hasScheduledCancel && sub?.scheduled_change && (
              <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-700">
                      Cancellation scheduled
                    </p>
                    <p className="text-amber-700/80">
                      Your Pro access ends on {formatDate(sub.scheduled_change.effective_at)}. You can resume any time before then.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleResume}
                  disabled={resumeLoading}
                  variant="outline"
                  className="h-9 shrink-0 self-start rounded-xl border-amber-500/40 text-amber-700 hover:bg-amber-500/10 sm:self-auto"
                >
                  {resumeLoading ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                  Resume plan
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Paid management */}
      {isPaid && sub && (
        <>
          {/* Payment wallet */}
          <Card className="border-[#0A0A0A]/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <Wallet className="size-5 text-[#00A975]" />
                  Payment methods
                </CardTitle>
                <CardDescription className="text-xs">
                  Cards are stored securely by Paddle. We never see your card details.
                </CardDescription>
              </div>
              {portalUpdateUrl && (
                <Button
                  render={<a href={portalUpdateUrl} target="_blank" rel="noopener noreferrer" />}
                  variant="outline"
                  className="h-9 rounded-xl border-[#0A0A0A]/15"
                >
                  <CreditCard className="size-4" />
                  Add / Update
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {overviewPaymentMethods.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payment method on file yet.
                  {portalUpdateUrl ? " Add one to keep your subscription safe." : ""}
                </p>
              ) : (
                overviewPaymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="flex items-center justify-between rounded-xl border border-[#0A0A0A]/10 bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-[#0A0A0A]">
                        {pm.type === "card" ? (
                          <CreditCard className="size-5 text-[#00C98B]" />
                        ) : (
                          <Wallet className="size-5 text-[#00C98B]" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">
                          {pm.type === "card"
                            ? `${BRAND_LABELS[pm.brand ?? ""] ?? "Card"} •••• ${pm.last4}`
                            : pm.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pm.type === "card"
                            ? `Expires ${String(pm.expiry_month ?? 0).padStart(2, "0")}/${pm.expiry_year}`
                            : "PayPal"}
                        </p>
                      </div>
                    </div>
                    {pm.type === "card" && pm.cardholder_name && (
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {pm.cardholder_name}
                      </span>
                    )}
                  </div>
                ))
              )}
              <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-[#00A975]" />
                PCI-DSS compliant — powered by Paddle
              </p>
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card className="border-[#0A0A0A]/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <Receipt className="size-5 text-[#00A975]" />
                Invoices
              </CardTitle>
              <CardDescription className="text-xs">
                Download receipts for every billing period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overviewInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No invoices yet. Receipts will appear here after your first payment.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overviewInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {inv.number}
                        </TableCell>
                        <TableCell>{formatDate(inv.billed_at)}</TableCell>
                        <TableCell className="font-semibold">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: inv.currency_code,
                          }).format(inv.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={inv.status === "completed" || inv.status === "billed" ? "default" : "secondary"} className="bg-[#00C98B]/10 text-[#00A975]">
                            {inv.status === "completed" || inv.status === "billed" ? "Paid" : inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.pdf_url ? (
                            <Button
                              render={<a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" />}
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-foreground"
                              title="Download PDF"
                            >
                              <Download className="size-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Danger zone + portal */}
          <Card className="border-[#0A0A0A]/10">
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-heading text-base font-semibold">
                  Manage subscription
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {hasScheduledCancel
                    ? "This plan is scheduled to cancel. Resume it, or manage details in Paddle."
                    : "You can cancel anytime — you'll keep Pro access until the end of your billing period."}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                {portalOverviewUrl && (
                  <Button
                    render={<a href={portalOverviewUrl} target="_blank" rel="noopener noreferrer" />}
                    variant="outline"
                    className="rounded-xl border-[#0A0A0A]/15"
                  >
                    <ExternalLink className="size-4" />
                    Paddle portal
                  </Button>
                )}
                {!hasScheduledCancel && (
                  <Button
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={resumeLoading}
                    variant="outline"
                    className="rounded-xl border-red-500/20 text-red-600 hover:bg-red-500/5 hover:text-red-600"
                  >
                    {resumeLoading ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                    Cancel plan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Overview loading (paid, not yet loaded) */}
      {isPaid && !overview && <BillingLoader />}

      {/* Pro Plan — Full Width */}
      {!isPaid && (
        <Card className="border-[#0A0A0A]/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-[#00C98B]" />
                <CardTitle className="font-heading text-lg">
                  Upgrade to Pro
                </CardTitle>
              </div>
              <Badge className="bg-[#00C98B] text-[#0A0A0A] hover:bg-[#00C98B]/90">
                Save 10%
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Billing Period Toggle */}
            <div className="flex gap-3">
              <button
                onClick={() => setPeriod("monthly")}
                className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${period === "monthly"
                  ? "border-[#00C98B] bg-[#00C98B]/5"
                  : "border-[#0A0A0A]/10 hover:border-[#0A0A0A]/20"
                  }`}
              >
                <div className="flex items-baseline gap-1">
                  <span className="font-heading text-2xl font-bold">
                    $12
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /mo
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Billed monthly
                </p>
              </button>

              <button
                onClick={() => setPeriod("yearly")}
                className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${period === "yearly"
                  ? "border-[#00C98B] bg-[#00C98B]/5"
                  : "border-[#0A0A0A]/10 hover:border-[#0A0A0A]/20"
                  }`}
              >
                <div className="flex items-baseline gap-1">
                  <span className="font-heading text-2xl font-bold">
                    $130
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /yr
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#00A975]">
                  Save $14/year
                </p>
              </button>
            </div>

            {/* Features */}
            <ul className="space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 text-sm"
                >
                  <Check className="size-4 shrink-0 text-[#00A975]" />
                  {f}
                </li>
              ))}
            </ul>

            {/* Coupon Input */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Have a coupon?</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && validateCoupon()}
                    disabled={!!couponResult}
                    className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white pl-10 font-mono font-bold uppercase"
                  />
                </div>
                {couponResult ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearCoupon}
                    className="h-11 rounded-xl border-red-500/20 text-red-600 hover:bg-red-500/5"
                  >
                    <X className="size-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={validateCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="h-11 rounded-xl border-[#0A0A0A]/15"
                  >
                    {couponLoading ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-[#0A0A0A]/20 border-t-[#0A0A0A]" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                )}
              </div>
              {couponError && (
                <p className="text-xs text-red-600">{couponError}</p>
              )}
              {couponResult?.valid && (
                <div className="flex items-center gap-2 rounded-xl border border-[#00C98B]/20 bg-[#00C98B]/5 px-3 py-2">
                  <Check className="size-4 text-[#00C98B]" />
                  <span className="text-sm font-semibold text-[#00A975]">
                    {couponResult.discount_type === "percent"
                      ? `${couponResult.discount_value}% off`
                      : `$${couponResult.discount_value} off`}{" "}
                    applied!
                  </span>
                </div>
              )}
            </div>

            {/* Price Summary */}
            {couponResult?.valid && (
              <div className="rounded-xl border border-[#0A0A0A]/10 bg-[#0A0A0A]/5 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Original price</span>
                  <span className="line-through text-muted-foreground">
                    ${basePrice}{period === "monthly" ? "/mo" : "/yr"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-semibold">You pay</span>
                  <span className="font-heading text-2xl font-bold text-[#00A975]">
                    ${discountedPrice.toFixed(2)}{period === "monthly" ? "/mo" : "/yr"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-[#00A975]">
                    You save ${Math.max(0, basePrice - discountedPrice).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">
                    with code {couponResult.code}
                  </span>
                </div>
              </div>
            )}

            {/* CTA */}
            <Button
              onClick={handleCheckout}
              disabled={checkoutLoading || !paddle}
              className="w-full h-12 rounded-xl bg-[#0A0A0A] font-bold text-white hover:bg-[#0A0A0A]/90"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="size-4" />
                  {couponResult?.valid
                    ? `Upgrade — $${discountedPrice.toFixed(2)}/${period === "monthly" ? "mo" : "yr"}`
                    : `Upgrade to Pro — $${period === "monthly" ? "12/mo" : "130/yr"}`
                  }
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Cancel anytime. No questions asked.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel your Pro plan?</DialogTitle>
            <DialogDescription>
              You will keep full Pro access until{" "}
              {sub?.current_period_end ? formatDate(sub.current_period_end) : "the end of your current billing period"}
              , then your plan will switch to Free. No charges after that.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              className="rounded-xl"
            >
              Keep my plan
            </Button>
            <Button
              onClick={handleCancel}
              variant="destructive"
              className="rounded-xl"
            >
              <ChevronRight className="size-4" />
              Yes, cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}