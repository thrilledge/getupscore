import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["pending", "approved", "rejected"];

/**
 * GET /api/admin/reviews
 * Admin: list reviews (filter by status) plus per-status counts.
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const admin = createSupabaseAdminClient() as any;
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));

    let query = admin.from("reviews").select("*", { count: "exact" });
    if (status && VALID_STATUSES.includes(status)) query = query.eq("status", status);

    const { data: reviews, count, error: listError } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (listError) throw listError;

    const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
      admin.from("reviews").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("reviews").select("*", { count: "exact", head: true }).eq("status", "approved"),
      admin.from("reviews").select("*", { count: "exact", head: true }).eq("status", "rejected"),
    ]);

    return NextResponse.json({
      ok: true,
      reviews: (reviews ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        rating: r.rating,
        message: r.message,
        status: r.status,
        created_at: r.created_at,
      })),
      stats: {
        total: (pendingRes.count ?? 0) + (approvedRes.count ?? 0) + (rejectedRes.count ?? 0),
        pending: pendingRes.count ?? 0,
        approved: approvedRes.count ?? 0,
        rejected: rejectedRes.count ?? 0,
      },
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/reviews
 * Admin: approve / reject a review (or delete with { action: "delete" }).
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { reviewId, action } = body ?? {};

    if (!reviewId || typeof reviewId !== "string") {
      return NextResponse.json({ error: "reviewId is required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient() as any;

    if (action === "delete") {
      const { error: delError } = await admin.from("reviews").delete().eq("id", reviewId);
      if (delError) throw delError;
      return NextResponse.json({ ok: true });
    }

    if (!action || !VALID_STATUSES.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("reviews")
      .update({ status: action })
      .eq("id", reviewId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, review: data });
  } catch {
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}