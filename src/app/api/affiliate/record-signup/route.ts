import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/affiliate/record-signup
 * Records a referral signup after a new user registers.
 * Called via sendBeacon from the signup page when a ref cookie is present.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { referral_code, user_id } = body;

    if (!referral_code || !user_id) {
      return NextResponse.json({ ok: false, error: "Missing referral_code or user_id" });
    }

    const admin = createSupabaseAdminClient() as any;

    // Find affiliate by referral code
    const { data: affiliate, error: affErr } = await admin
      .from("affiliates")
      .select("id")
      .ilike("referral_code", referral_code.trim())
      .eq("status", "active")
      .single();

    if (affErr || !affiliate) {
      return NextResponse.json({ ok: false, error: "Invalid referral code" });
    }

    // Check if user already referred
    const { data: existing } = await admin
      .from("referral_signups")
      .select("id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, message: "Already recorded" });
    }

    // Find the most recent click from this referral code (for attribution)
    const { data: recentClick } = await admin
      .from("referral_clicks")
      .select("id")
      .ilike("referral_code", referral_code.trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Insert signup record
    const { error: insertErr } = await admin.from("referral_signups").insert({
      affiliate_id: affiliate.id,
      referral_code: referral_code.trim().toUpperCase(),
      user_id: user_id,
      click_id: recentClick?.id ?? null,
      status: "signup",
    });

    if (insertErr) {
      console.error("[record-signup] Insert failed:", insertErr.message);
      return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
    }

    // Mark click as converted
    if (recentClick?.id) {
      await admin
        .from("referral_clicks")
        .update({ converted: true, converted_user_id: user_id, converted_at: new Date().toISOString() })
        .eq("id", recentClick.id);
    }

    // Update affiliate stats
    await admin
      .from("affiliates")
      .update({
        total_referrals: (affiliate.total_referrals ?? 0) + 1,
        total_signups: (affiliate.total_signups ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", affiliate.id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[record-signup] Error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: "Failed to record signup" }, { status: 500 });
  }
}
