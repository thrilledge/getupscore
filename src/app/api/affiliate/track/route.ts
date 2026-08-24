import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/affiliate/track
 * Track a referral click. Called by landing page when ?ref=CODE is present.
 * Sets a cookie for 30-day attribution.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, fingerprint, landingPage } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient() as any;

    // Get visitor IP from headers
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? null;
    const userAgent = request.headers.get("user-agent") ?? null;
    const referrer = request.headers.get("referer") ?? null;

    const { data: clickId } = await admin.rpc("track_affiliate_click", {
      p_referral_code: code.trim().toUpperCase(),
      p_visitor_ip: ip,
      p_visitor_fingerprint: fingerprint || null,
      p_user_agent: userAgent,
      p_referrer_url: referrer,
      p_landing_page: landingPage || null,
    });

    if (!clickId) {
      return NextResponse.json({ ok: false, error: "Invalid referral code" });
    }

    return NextResponse.json({ ok: true, clickId });
  } catch {
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 });
  }
}
