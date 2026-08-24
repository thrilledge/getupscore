import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/affiliate/register
 * Register current user as an affiliate. Generates a unique referral code.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = (await import("@/lib/supabase/server")).createSupabaseAdminClient() as any;

    // Check if already registered
    const { data: existing } = await admin
      .from("affiliates")
      .select("id, referral_code")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ ok: true, affiliate: existing });
    }

    // Generate unique referral code
    const baseCode = (user.email?.split("@")[0] ?? "user").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
    let referralCode = baseCode;
    let attempts = 0;

    while (attempts < 10) {
      const { data: check } = await admin
        .from("affiliates")
        .select("id")
        .eq("referral_code", referralCode)
        .single();

      if (!check) break;

      referralCode = baseCode + Math.floor(1000 + Math.random() * 9000);
      attempts++;
    }

    // Create affiliate record
    const { data: affiliate, error } = await admin
      .from("affiliates")
      .insert({
        user_id: user.id,
        referral_code: referralCode,
        commission_rate: 20.00,
        commission_type: "percent",
        status: "active",
        payout_email: user.email,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, affiliate });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "You are already registered as an affiliate" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}

/**
 * GET /api/affiliate/register
 * Get current user's affiliate info.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = (await import("@/lib/supabase/server")).createSupabaseAdminClient() as any;

    const { data: stats } = await admin.rpc("get_affiliate_stats", { p_user_id: user.id });

    return NextResponse.json({ ok: true, ...stats });
  } catch {
    return NextResponse.json({ error: "Failed to fetch affiliate info" }, { status: 500 });
  }
}
