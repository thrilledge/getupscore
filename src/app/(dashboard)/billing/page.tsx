"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaddle, setCheckoutCompletedHandler } from "@/components/paddle-provider";
import { env } from "@/lib/env";
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
} from "lucide-react";
import { toast } from "sonner";

type BillingPeriod = "monthly" | "yearly";

const PRO_FEATURES = [
  "Full jobs dashboard",
  "AI job analysis",
  "Unlimited proposals",
  "Market trends",
  "Extension API access",
  "Unlimited filters",
];

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
  const [couponResult, setCouponResult] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const isPaid = subscription?.is_paid ?? false;
  const isLoading = userLoading || subLoading;

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
    setCheckoutCompletedHandler(async (data: any) => {
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
      const checkoutOptions: any = {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-[#00C98B]" />
      </div>
    );
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
                    ? "You have full access to all features"
                    : "Upgrade to unlock jobs, proposals & more"}
                </CardDescription>
              </div>
            </div>

            <Badge
              variant={isPaid ? "default" : "secondary"}
              className={
                isPaid
                  ? "bg-[#00C98B]/10 text-[#00A975] hover:bg-[#00C98B]/20"
                  : ""
              }
            >
              {isPaid ? "Active" : "Free"}
            </Badge>
          </div>
        </CardHeader>

        {isPaid && subscription?.current_period_end && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" />
              Next billing:{" "}
              {new Date(
                subscription.current_period_end
              ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </CardContent>
        )}
      </Card>

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
                className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${
                  period === "monthly"
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
                className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${
                  period === "yearly"
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
    </div>
  );
}
