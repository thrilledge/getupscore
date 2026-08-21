import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const VALID_SEGMENTS = ["power", "active", "casual", "at_risk", "churned", "new"];

interface SegmentRow {
  user_id: string;
  segment: string;
  score: number | null;
  last_active_at: string | null;
  total_proposals: number | null;
  total_analyses: number | null;
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const admin = createSupabaseAdminClient();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const perPage = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("per_page") ?? "20", 10) || 20)
    );
    const search = (searchParams.get("search") ?? "").trim();
    const segment = searchParams.get("segment") ?? "";

    // Fetch all users via the typed admin auth API
    const { data: usersList, error: listError } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (listError) throw listError;

    let users = usersList?.users ?? [];

    // Search by email or display name
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.user_metadata?.display_name?.toLowerCase().includes(q)
      );
    }

    const userIds = users.map((u) => u.id);

    // user_segments / subscriptions are not in generated types yet
    const [segmentsRes, subsRes] = await Promise.all([
      userIds.length
        ? (admin as any).from("user_segments").select("*").in("user_id", userIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? (admin as any)
            .from("subscriptions")
            .select("user_id, status")
            .in("user_id", userIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (segmentsRes.error) throw segmentsRes.error;

    const segmentMap = new Map<string, SegmentRow>(
      ((segmentsRes.data ?? []) as SegmentRow[]).map((s) => [s.user_id, s])
    );
    const subMap = new Map<string, string>(
      ((subsRes.data ?? []) as { user_id: string; status: string }[]).map((s) => [
        s.user_id,
        s.status,
      ])
    );

    const enriched = users.map((u) => {
      const seg = segmentMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "unknown",
        displayName: u.user_metadata?.display_name ?? "",
        plan: subMap.get(u.id) === "active" ? "pro" : "free",
        segment: seg?.segment ?? "new",
        segmentScore: seg?.score ?? 0,
        lastActiveAt: seg?.last_active_at ?? u.last_sign_in_at,
        totalProposals: seg?.total_proposals ?? 0,
        totalAnalyses: seg?.total_analyses ?? 0,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at,
      };
    });

    // Stats computed across all matched users (before segment filter)
    const stats = {
      total: enriched.length,
      power: enriched.filter((u) => u.segment === "power").length,
      active: enriched.filter((u) => u.segment === "active").length,
      casual: enriched.filter((u) => u.segment === "casual").length,
      at_risk: enriched.filter((u) => u.segment === "at_risk").length,
      churned: enriched.filter((u) => u.segment === "churned").length,
      new: enriched.filter((u) => u.segment === "new").length,
    };

    const filtered = VALID_SEGMENTS.includes(segment)
      ? enriched.filter((u) => u.segment === segment)
      : enriched;

    // Highest engagement first, newest as tiebreaker
    filtered.sort(
      (a, b) =>
        b.segmentScore - a.segmentScore ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);

    return NextResponse.json({
      ok: true,
      users: paginated,
      stats,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
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
  const adminUserId = auth.userId;

  try {
    const admin = createSupabaseAdminClient();
    const db = admin as any;
    const body = await req.json();
    const { userId, action } = body;

    if (
      !action ||
      typeof action !== "string" ||
      (!userId && action !== "refresh_segments")
    ) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    async function logActivity(actionName: string, metadata: Record<string, unknown>) {
      await db.from("user_activity_logs").insert({
        user_id: userId,
        action: actionName,
        metadata: { ...metadata, performed_by: adminUserId },
      });
    }

    switch (action) {
      case "set_pro":
      case "set_free": {
        const { data: targetUser } = await admin.auth.admin.getUserById(userId);
        if (!targetUser?.user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const nextStatus = action === "set_pro" ? "active" : "canceled";
        const insertStatus = action === "set_pro" ? "active" : "free";

        const { data: existing } = await db
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);

        let error: unknown;
        if (existing?.length) {
          ({ error } = await db
            .from("subscriptions")
            .update({ status: nextStatus })
            .eq("id", existing[0].id));
        } else {
          ({ error } = await db
            .from("subscriptions")
            .insert({ user_id: userId, status: insertStatus }));
        }
        if (error) throw error;

        await logActivity("subscription_changed", {
          plan: action === "set_pro" ? "pro" : "free",
        });

        return NextResponse.json({
          ok: true,
          message:
            action === "set_pro"
              ? "User upgraded to Pro"
              : "User set to Free",
        });
      }

      case "refresh_segments": {
        const { error } = await db.rpc("refresh_user_segments");
        if (error) throw error;
        return NextResponse.json({ ok: true, message: "User segments refreshed" });
      }

      case "send_password_reset": {
        const { data: targetUser } = await admin.auth.admin.getUserById(userId);
        const email = targetUser?.user?.email;
        if (!email) {
          return NextResponse.json({ error: "User has no email" }, { status: 400 });
        }

        const { data, error } = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
        });
        if (error) throw error;

        await logActivity("password_reset_sent", {});

        return NextResponse.json({
          ok: true,
          message: "Password reset link generated",
          actionLink: data.properties?.action_link ?? null,
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
