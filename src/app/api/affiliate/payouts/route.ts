import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient() as any;

  // Get affiliate ID
  const { data: affiliate } = await admin
    .from("affiliates")
    .select("id, pending_commission, total_paid_out")
    .eq("user_id", user.id)
    .single();

  if (!affiliate) {
    return NextResponse.json({ ok: true, payouts: [] });
  }

  const { data: payouts } = await admin
    .from("affiliate_payouts")
    .select("id, amount, commission_count, payout_method, bank_name, account_number, status, notes, processed_at, created_at")
    .eq("affiliate_id", affiliate.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    ok: true,
    payouts: payouts || [],
    pending: affiliate.pending_commission || 0,
    totalPaid: affiliate.total_paid_out || 0,
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { bank_name?: string; account_number?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.bank_name?.trim() || !body.account_number?.trim()) {
    return NextResponse.json({ error: "Bank name and account number are required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient() as any;

  // Get affiliate
  const { data: affiliate, error: affErr } = await admin
    .from("affiliates")
    .select("id, pending_commission")
    .eq("user_id", user.id)
    .single();

  if (affErr || !affiliate) {
    return NextResponse.json({ error: "You are not an affiliate" }, { status: 400 });
  }

  const pending = Number(affiliate.pending_commission) || 0;
  if (pending < 1) {
    return NextResponse.json({ error: "No pending commission to withdraw" }, { status: 400 });
  }

  // Check for existing pending request
  const { data: existing } = await admin
    .from("affiliate_payouts")
    .select("id")
    .eq("affiliate_id", affiliate.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You already have a pending payout request" }, { status: 400 });
  }

  // Create payout request
  const { data: payout, error: payoutErr } = await admin
    .from("affiliate_payouts")
    .insert({
      affiliate_id: affiliate.id,
      amount: pending,
      payout_method: "bank",
      bank_name: body.bank_name.trim(),
      account_number: body.account_number.trim(),
      status: "pending",
    } as any)
    .select("id, amount, status, created_at")
    .single();

  if (payoutErr) {
    console.warn("[Payout] Insert error:", payoutErr.message);
    return NextResponse.json({ error: "Failed to create payout request" }, { status: 500 });
  }

  // Update affiliate's payout info so it reflects latest preference
  await admin
    .from("affiliates")
    .update({
      payout_method: "bank",
      payout_email: `${body.bank_name.trim()} - ${body.account_number.trim()}`,
    })
    .eq("id", affiliate.id);

  return NextResponse.json({ ok: true, payout });
}
