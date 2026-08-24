import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

// GET — list all affiliates with stats
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const admin = createSupabaseAdminClient() as any;

    const { data: affiliates, error } = await admin
      .from("affiliates")
      .select("*")
      .order("total_earned", { ascending: false });

    if (error) throw error;

    // Get commission summary per affiliate
    const { data: commissions } = await admin
      .from("commissions")
      .select("affiliate_id, status, commission_amount");

    const commissionMap: Record<string, { pending: number; approved: number; paid: number; total: number }> = {};
    for (const c of commissions ?? []) {
      if (!commissionMap[c.affiliate_id]) {
        commissionMap[c.affiliate_id] = { pending: 0, approved: 0, paid: 0, total: 0 };
      }
      commissionMap[c.affiliate_id].total += Number(c.commission_amount);
      if (c.status === "pending") commissionMap[c.affiliate_id].pending += Number(c.commission_amount);
      if (c.status === "approved") commissionMap[c.affiliate_id].approved += Number(c.commission_amount);
      if (c.status === "paid") commissionMap[c.affiliate_id].paid += Number(c.commission_amount);
    }

    // Enrich with user emails
    const userIds = (affiliates ?? []).map((a: any) => a.user_id);
    const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const userMap: Record<string, { email: string; name: string }> = {};
    for (const u of usersList?.users ?? []) {
      userMap[u.id] = {
        email: u.email ?? "unknown",
        name: u.user_metadata?.display_name ?? u.email?.split("@")[0] ?? "",
      };
    }

    const enriched = (affiliates ?? []).map((a: any) => ({
      ...a,
      email: userMap[a.user_id]?.email ?? "unknown",
      name: userMap[a.user_id]?.name ?? "",
      commission_breakdown: commissionMap[a.id] ?? { pending: 0, approved: 0, paid: 0, total: 0 },
    }));

    // Summary stats
    const summary = {
      totalAffiliates: enriched.length,
      activeAffiliates: enriched.filter((a: any) => a.status === "active").length,
      totalEarned: enriched.reduce((s: number, a: any) => s + Number(a.total_earned), 0),
      totalPaidOut: enriched.reduce((s: number, a: any) => s + Number(a.total_paid_out), 0),
      totalPending: enriched.reduce((s: number, a: any) => s + Number(a.pending_commission), 0),
      totalClicks: enriched.reduce((s: number, a: any) => s + Number(a.total_clicks), 0),
      totalConversions: enriched.reduce((s: number, a: any) => s + Number(a.total_conversions), 0),
    };

    return NextResponse.json({ ok: true, affiliates: enriched, summary });
  } catch {
    return NextResponse.json({ error: "Failed to fetch affiliates" }, { status: 500 });
  }
}

// PUT — update an affiliate (admin can change commission rate, status, etc.)
export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Affiliate ID required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient() as any;

    const cleanUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.status) cleanUpdates.status = updates.status;
    if (updates.commission_rate !== undefined) cleanUpdates.commission_rate = updates.commission_rate;
    if (updates.commission_type) cleanUpdates.commission_type = updates.commission_type;
    if (updates.fixed_commission_amount !== undefined) cleanUpdates.fixed_commission_amount = updates.fixed_commission_amount;
    if (updates.payout_method) cleanUpdates.payout_method = updates.payout_method;
    if (updates.payout_email !== undefined) cleanUpdates.payout_email = updates.payout_email;
    if (updates.minimum_payout !== undefined) cleanUpdates.minimum_payout = updates.minimum_payout;

    const { error } = await admin
      .from("affiliates")
      .update(cleanUpdates)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update affiliate" }, { status: 500 });
  }
}
