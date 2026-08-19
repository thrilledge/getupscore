"use client";

import { useSubscription } from "@/hooks/use-subscription";
import { PLANS } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Zap, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature?: string;
}

export function SubscriptionGate({
  children,
  feature = "this feature",
}: SubscriptionGateProps) {
  const { subscription, loading } = useSubscription();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-[#00C98B]" />
      </div>
    );
  }

  if (subscription?.is_paid) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Card className="w-full max-w-lg overflow-hidden border-[#0A0A0A]/10 bg-white">
        <div className="h-1 bg-gradient-to-r from-[#00C98B] to-[#00A975]" />

        <CardHeader className="text-center pt-8">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#0A0A0A]">
            <Lock className="size-6 text-white" />
          </div>

          <CardTitle className="font-heading text-xl">
            Upgrade to Pro
          </CardTitle>

          <CardDescription className="text-sm text-muted-foreground">
            {feature} requires a Pro subscription.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 px-8 pb-8">
          <div className="rounded-xl border border-[#00C98B]/20 bg-[#00C98B]/5 p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-heading text-lg font-bold">
                {PLANS.pro.name}
              </span>
              <div className="text-right">
                <span className="font-heading text-2xl font-bold text-[#00A975]">
                  ${PLANS.pro.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  /mo
                </span>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {PLANS.pro.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm"
                >
                  <Check className="size-4 shrink-0 text-[#00A975]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={() => router.push("/billing")}
            className="w-full h-11 rounded-xl bg-[#0A0A0A] font-bold text-white hover:bg-[#0A0A0A]/90"
          >
            <Zap className="size-4" />
            View Plans & Upgrade
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Cancel anytime. No questions asked.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
