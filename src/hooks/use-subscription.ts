"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { SubscriptionInfo } from "@/lib/subscription";

export function useSubscription() {
  const [subscription, setSubscription] =
    useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase.rpc("check_subscription", {
        p_user_id: user.id,
      });

      setSubscription(
        (data as unknown as SubscriptionInfo) ?? {
          plan: "free",
          status: "free",
          is_paid: false,
        }
      );
    } catch {
      setSubscription({
        plan: "free",
        status: "free",
        is_paid: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return { subscription, loading, refetch: fetchSubscription };
}
