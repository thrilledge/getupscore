import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/affiliate/referrals
 * Get referral signups for current affiliate.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = (await import("@/lib/supabase/server")).createSupabaseAdminClient() as any;

    // Get affiliate ID
    const { data: affiliate } = await admin
      .from("affiliates")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!affiliate) {
      return NextResponse.json({ ok: true, referrals: [], commissions: [] });
    }

    // Get referral signups
    const { data: referrals } = await admin
      .from("referral_signups")
      .select("id, user_id, status, plan_purchased, converted_at, created_at")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .limit(100);

    // Get commissions
    const { data: commissions } = await admin
      .from("commissions")
      .select("id, plan, sale_amount, commission_rate, commission_amount, status, created_at, paid_at")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .limit(100);

    // Get payout history
    const { data: payouts } = await admin
      .from("affiliate_payouts")
      .select("id, amount, commission_count, status, payout_method, payout_email, created_at, processed_at")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false });

    // Get daily clicks (last 30 days)
    const { data: clicks } = await admin
      .from("referral_clicks")
      .select("created_at")
      .eq("affiliate_id", affiliate.id)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const dailyClicks: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const count = clicks?.filter((c: any) => c.created_at?.slice(0, 10) === dayStr).length ?? 0;
      dailyClicks.push({ date: dayStr, count });
    }

    return NextResponse.json({
      ok: true,
      referrals: referrals ?? [],
      commissions: commissions ?? [],
      payouts: payouts ?? [],
      dailyClicks,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
  }
}
