"use client";

import { useEffect } from "react";
import { useUser } from "@/hooks/use-user";

/**
 * ReferralSignupRecorder — fires once when user reaches dashboard.
 * Checks for ref cookie and records the referral signup via API.
 * More reliable than sendBeacon on signup page (which may not have user.id).
 */
export function ReferralSignupRecorder() {
  const { user } = useUser();

  useEffect(() => {
    if (!user?.id) return;

    // Only run once per session
    if (sessionStorage.getItem("ref_recorded")) return;

    const match = document.cookie.match(/(?:^|;\s*)ref=([^;]*)/);
    if (!match) return;

    const referralCode = decodeURIComponent(match[1]);
    sessionStorage.setItem("ref_recorded", "1");

    fetch("/api/affiliate/record-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referral_code: referralCode,
        user_id: user.id,
      }),
    })
      .then((r) => r.json())
      .then((d) => console.log("[RefRecorder]", d))
      .catch(() => {});
  }, [user?.id]);

  return null;
}
