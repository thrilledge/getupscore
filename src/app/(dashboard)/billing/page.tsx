"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaddle } from "@/components/paddle-provider";
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

  const isPaid = subscription?.is_paid ?? false;
  const isLoading = userLoading || subLoading;

  const handleCheckout = useCallback(async () => {
    if (!user || !paddle) return;

    setCheckoutLoading(true);

    const priceId =
      period === "monthly"
        ? env.PADDLE_MONTHLY_PRICE_ID
        : env.PADDLE_YEARLY_PRICE_ID;

    try {
      paddle.Checkout.open({
        items: [
          {
            priceId,
            quantity: 1,
          },
        ],
        customer: {
          email: user.email ?? "",
        },
        customData: {
          user_id: user.id,
        },
        settings: {
          displayMode: "overlay",
          theme: "light",
          locale: "en",
        },
      });

      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch("/api/billing/status");
          const json = await res.json();
          if (json?.data?.is_paid) {
            clearInterval(pollInterval);
            setCheckoutLoading(false);
            await refetch();
            toast.success(
              "Welcome to Pro! All features unlocked."
            );
          }
        } catch {
          // ignore poll errors
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(pollInterval);
        setCheckoutLoading(false);
      }, 120000);
    } catch {
      setCheckoutLoading(false);
      toast.error("Checkout failed. Please try again.");
    }
  }, [user, paddle, refetch, period]);

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
                  Upgrade to Pro — ${period === "monthly" ? "12/mo" : "130/yr"}
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Cancel anytime. No questions asked.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Paid — Manage */}
      {isPaid && (
        <Card className="border-[#0A0A0A]/10">
          <CardHeader>
            <CardTitle className="font-heading text-base">
              Manage Subscription
            </CardTitle>
            <CardDescription className="text-xs">
              Update payment method, cancel, or view invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <ExternalLink className="size-4" />
              Open Paddle Customer Portal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
