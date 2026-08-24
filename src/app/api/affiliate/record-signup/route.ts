import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/affiliate/record-signup
 * Records a referral signup after a new user registers.
 * Called by the signup page when a ?ref= cookie is present.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { referral_code, user_id } = body;

    if (!referral_code || !user_id) {
      return NextResponse.json({ ok: false });
    }

    const admin = createSupabaseAdminClient() as any;

    // Find affiliate by referral code
    const { data: affiliate } = await admin
      .from("affiliates")
      .select("id")
      .ilike("referral_code", referral_code.trim())
      .eq("status", "active")
      .single();

    if (!affiliate) {
      return NextResponse.json({ ok: false, error: "Invalid referral code" });
    }

    // Check if user already referred
    const { data: existing } = await admin
      .from("referral_signups")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (existing) {
      return NextResponse.json({ ok: false, error: "User already referred" });
    }

    // Find the most recent click from this referral code (for attribution)
    const { data: recentClick } = await admin
      .from("referral_clicks")
      .select("id")
      .ilike("referral_code", referral_code.trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Record the signup
    await admin.from("referral_signups").insert({
      affiliate_id: affiliate.id,
      referral_code: referral_code.trim().toUpperCase(),
      user_id: user_id,
      click_id: recentClick?.id ?? null,
      status: "signup",
    });

    // Update click as converted if we found one
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
        total_referrals: admin.rpc ? undefined : undefined, // Stats updated via trigger or manual
        updated_at: new Date().toISOString(),
      })
      .eq("id", affiliate.id);

    // Use the RPC to properly increment
    await admin.rpc("record_referral_signup", {
      p_referral_code: referral_code.trim().toUpperCase(),
      p_user_id: user_id,
      p_click_id: recentClick?.id ?? null,
    }).catch(() => {
      // RPC might fail if duplicate — that's OK, we already inserted above
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to record signup" }, { status: 500 });
  }
}
