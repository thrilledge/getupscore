import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const admin = createSupabaseAdminClient() as any;

    // Get affiliate
    const { data: affiliate, error } = await admin
      .from("affiliates")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    // Get user info
    const { data: userData } = await admin.auth.admin.getUserById(affiliate.user_id);
    const email = userData?.user?.email ?? "unknown";
    const name = userData?.user?.user_metadata?.display_name ?? email.split("@")[0];

    // Get commissions
    const { data: commissions } = await admin
      .from("commissions")
      .select("*")
      .eq("affiliate_id", id)
      .order("created_at", { ascending: false });

    // Get referral signups
    const { data: signups } = await admin
      .from("referral_signups")
      .select("*")
      .eq("affiliate_id", id)
      .order("created_at", { ascending: false });

    // Get referral clicks (last 30 days grouped by day)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: clicks } = await admin
      .from("referral_clicks")
      .select("created_at, ip_address")
      .eq("affiliate_id", id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false });

    // Get payout requests
    const { data: payouts } = await admin
      .from("affiliate_payouts")
      .select("*")
      .eq("affiliate_id", id)
      .order("created_at", { ascending: false });

    // Group clicks by day
    const clicksByDay: Record<string, number> = {};
    for (const c of clicks ?? []) {
      const day = c.created_at.split("T")[0];
      clicksByDay[day] = (clicksByDay[day] || 0) + 1;
    }

    // Commission breakdown
    const commissionBreakdown = { pending: 0, approved: 0, paid: 0, total: 0 };
    for (const c of commissions ?? []) {
      commissionBreakdown.total += Number(c.commission_amount);
      if (c.status === "pending") commissionBreakdown.pending += Number(c.commission_amount);
      if (c.status === "approved") commissionBreakdown.approved += Number(c.commission_amount);
      if (c.status === "paid") commissionBreakdown.paid += Number(c.commission_amount);
    }

    // Signup breakdown
    const signupBreakdown = { total: signups?.length ?? 0, pending: 0, active: 0, converted: 0 };
    for (const s of signups ?? []) {
      if (s.status === "signup") signupBreakdown.pending++;
      if (s.status === "active" || s.status === "paid") signupBreakdown.active++;
      if (s.status === "converted") signupBreakdown.converted++;
    }

    return NextResponse.json({
      ok: true,
      affiliate: {
        ...affiliate,
        email,
        name,
      },
      commissions: commissions ?? [],
      signups: signups ?? [],
      clicks,
      clicksByDay,
      payouts: payouts ?? [],
      commissionBreakdown,
      signupBreakdown,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch affiliate details" }, { status: 500 });
  }
}
