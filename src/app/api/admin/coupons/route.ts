import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

// GET — list all coupons with usage stats
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

    const { data: coupons, error } = await admin
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get usage counts per coupon
    const { data: usages } = await admin
      .from("coupon_usages")
      .select("coupon_id, discount_applied");

    const usageMap: Record<string, { count: number; totalDiscount: number }> = {};
    for (const u of usages ?? []) {
      if (!usageMap[u.coupon_id]) {
        usageMap[u.coupon_id] = { count: 0, totalDiscount: 0 };
      }
      usageMap[u.coupon_id].count++;
      usageMap[u.coupon_id].totalDiscount += Number(u.discount_applied);
    }

    const enriched = (coupons ?? []).map((c: any) => ({
      ...c,
      usage_count: usageMap[c.id]?.count ?? 0,
      total_discount_given: usageMap[c.id]?.totalDiscount ?? 0,
    }));

    return NextResponse.json({ ok: true, coupons: enriched });
  } catch {
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

// POST — create a new coupon
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { code, description, discount_type, discount_value, max_uses, max_uses_per_user, allowed_plans, starts_at, expires_at } = body;

    if (!code || !discount_type || !discount_value) {
      return NextResponse.json({ error: "code, discount_type, and discount_value are required" }, { status: 400 });
    }

    if (!["percent", "fixed"].includes(discount_type)) {
      return NextResponse.json({ error: "discount_type must be 'percent' or 'fixed'" }, { status: 400 });
    }

    if (discount_type === "percent" && (discount_value < 1 || discount_value > 100)) {
      return NextResponse.json({ error: "Percent discount must be between 1 and 100" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient() as any;

    // Check unique code
    const { data: existing } = await admin
      .from("coupons")
      .select("id")
      .ilike("code", code)
      .single();

    if (existing) {
      return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 });
    }

    const { data: coupon, error } = await admin
      .from("coupons")
      .insert({
        code: code.toUpperCase().trim(),
        description: description?.trim() || null,
        discount_type,
        discount_value,
        max_uses: max_uses || null,
        max_uses_per_user: max_uses_per_user || 1,
        allowed_plans: allowed_plans?.length ? allowed_plans : null,
        starts_at: starts_at || new Date().toISOString(),
        expires_at: expires_at || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, coupon });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}

// PUT — update a coupon
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
      return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient() as any;

    // Clean up updates
    const cleanUpdates: any = {};
    if (updates.code) cleanUpdates.code = updates.code.toUpperCase().trim();
    if (updates.description !== undefined) cleanUpdates.description = updates.description?.trim() || null;
    if (updates.discount_type) cleanUpdates.discount_type = updates.discount_type;
    if (updates.discount_value !== undefined) cleanUpdates.discount_value = updates.discount_value;
    if (updates.max_uses !== undefined) cleanUpdates.max_uses = updates.max_uses || null;
    if (updates.max_uses_per_user !== undefined) cleanUpdates.max_uses_per_user = updates.max_uses_per_user || 1;
    if (updates.allowed_plans !== undefined) cleanUpdates.allowed_plans = updates.allowed_plans?.length ? updates.allowed_plans : null;
    if (updates.starts_at !== undefined) cleanUpdates.starts_at = updates.starts_at;
    if (updates.expires_at !== undefined) cleanUpdates.expires_at = updates.expires_at;
    if (updates.active !== undefined) cleanUpdates.active = updates.active;
    cleanUpdates.updated_at = new Date().toISOString();

    const { data: coupon, error } = await admin
      .from("coupons")
      .update(cleanUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, coupon });
  } catch {
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

// DELETE — delete a coupon
export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient() as any;

    // Delete usages first, then coupon
    await admin.from("coupon_usages").delete().eq("coupon_id", id);
    const { error } = await admin.from("coupons").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
