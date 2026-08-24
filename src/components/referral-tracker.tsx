"use client";

import { useEffect } from "react";

/**
 * ReferralTracker — reads ?ref=CODE from URL, tracks the click via API,
 * and stores the referral code in a cookie for 30 days.
 * Used in the root layout to track affiliate referrals.
 */
export function ReferralTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");

    if (!refCode) return;

    // Store in cookie (30 days)
    document.cookie = `ref=${refCode}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;

    // Track the click
    try {
      // Generate a simple browser fingerprint for dedup
      const fingerprint = `fp_${navigator.userAgent.length}_${screen.width}x${screen.height}`;

      fetch("/api/affiliate/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: refCode,
          fingerprint,
          landingPage: window.location.pathname,
        }),
      }).catch(() => {
        // Silently fail — tracking is best-effort
      });
    } catch {
      // Ignore errors
    }

    // Clean up URL (remove ?ref= from address bar)
    if (window.history.replaceState) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  return null;
}

/**
 * Get referral code from cookie (used during signup/checkout)
 */
export function getReferralCode(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)ref=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}
