import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["bug", "feature", "general", "proposal_quality"];
const VALID_STATUSES = ["new", "reviewed", "actioned", "dismissed"];

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

    const category = searchParams.get("category") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));

    // ── Filtered list query ─────────────────────────────────
    let query = admin
      .from("user_feedback")
      .select("*", { count: "exact" });

    if (category && category !== "all") query = query.eq("category", category);
    if (status && status !== "all") query = query.eq("status", status);

    const { data: feedback, count, error: listError } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (listError) throw listError;

    // ── Stats (unfiltered counts per status) ────────────────
    const [totalRes, newRes, reviewedRes, actionedRes] = await Promise.all([
      admin.from("user_feedback").select("*", { count: "exact", head: true }),
      admin.from("user_feedback").select("*", { count: "exact", head: true }).eq("status", "new"),
      admin.from("user_feedback").select("*", { count: "exact", head: true }).eq("status", "reviewed"),
      admin.from("user_feedback").select("*", { count: "exact", head: true }).eq("status", "actioned"),
    ]);

    // ── Resolve user emails ─────────────────────────────────
    const userIds = Array.from(
      new Set((feedback ?? []).map((f: any) => f.user_id).filter(Boolean))
    ) as string[];

    const emailMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
      usersList?.users?.forEach((u: any) => {
        emailMap[u.id] = u.email ?? "unknown";
      });
    }

    return NextResponse.json({
      ok: true,
      feedback: (feedback ?? []).map((f: any) => ({
        ...f,
        user_email: f.user_id ? emailMap[f.user_id] ?? "unknown" : "deleted_user",
      })),
      stats: {
        total: totalRes.count ?? 0,
        new: newRes.count ?? 0,
        reviewed: reviewedRes.count ?? 0,
        actioned: actionedRes.count ?? 0,
      },
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

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
    const { feedbackId, status, admin_notes } = body ?? {};

    if (!feedbackId || typeof feedbackId !== "string") {
      return NextResponse.json({ error: "feedbackId is required" }, { status: 400 });
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (
      status === undefined &&
      admin_notes === undefined
    ) {
      return NextResponse.json(
        { error: "Nothing to update — provide status or admin_notes" },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    if (status !== undefined) update.status = status;
    if (admin_notes !== undefined) update.admin_notes = String(admin_notes).slice(0, 5000);

    const admin = createSupabaseAdminClient() as any;
    const { data, error } = await admin
      .from("user_feedback")
      .update(update)
      .eq("id", feedbackId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, feedback: data });
  } catch {
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }
}
