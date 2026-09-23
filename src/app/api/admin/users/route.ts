import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

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
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const perPage = parseInt(searchParams.get("per_page") ?? "20", 10);
    const search = searchParams.get("search") ?? "";

    const { data: usersList, error: listError } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) throw listError;

    let users = usersList?.users ?? [];

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.user_metadata?.display_name?.toLowerCase().includes(q)
      );
    }

    // Get subscription status for all users.
    // Fetches the whole (small) subscriptions table instead of filtering with
    // .in() — PostgREST URIs with hundreds of UUIDs exceed nginx's request-line
    // limit on the self-hosted DB, silently returning 502 and blanking the map.
    const { data: subs } = await (admin as any)
      .from("subscriptions")
      .select("user_id, status");

    const subMap = new Map((subs ?? []).map((s: any) => [s.user_id, s.status]));

    // Enrich users with subscription status
    const enriched = users.map((u) => ({
      id: u.id,
      email: u.email ?? "unknown",
      displayName: u.user_metadata?.display_name ?? "",
      isAdmin: u.app_metadata?.is_admin === true,
      plan: subMap.get(u.id) === "active" ? "pro" : "free",
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
    }));

    // Sort by created_at desc
    enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const total = enriched.length;
    const start = (page - 1) * perPage;
    const paginated = enriched.slice(start, start + perPage);

    return NextResponse.json({
      ok: true,
      users: paginated,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
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

  try {
    const admin = createSupabaseAdminClient();
    const body = await req.json();
    const { userId, isAdmin } = body;

    if (!userId || typeof isAdmin !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Get current user metadata
    const { data: targetUser } = await admin.auth.admin.getUserById(userId);
    if (!targetUser?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentMetadata = targetUser.user.user_metadata || {};
    const currentAppMetadata = targetUser.user.app_metadata || {};

    // Update app_metadata with is_admin flag
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...currentAppMetadata,
        is_admin: isAdmin,
      },
    });

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, userId, isAdmin });
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
