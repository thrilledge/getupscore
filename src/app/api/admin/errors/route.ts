import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const VALID_SEVERITIES = ["info", "warn", "error", "critical"];

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

    const source = searchParams.get("source") ?? "";
    const severity = searchParams.get("severity") ?? "";
    const resolved = searchParams.get("resolved") ?? ""; // "true" | "false" | ""
    const search = searchParams.get("search")?.trim() ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));

    // ── Filtered list query ─────────────────────────────────
    let query = admin
      .from("error_logs")
      .select("*", { count: "exact" });

    if (source) query = query.eq("source", source);
    if (severity) query = query.eq("severity", severity);
    if (resolved === "true") query = query.eq("resolved", true);
    if (resolved === "false") query = query.eq("resolved", false);
    if (search) query = query.ilike("message", `%${search}%`);

    const { data: errors, count, error: listError } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (listError) throw listError;

    // ── Stats (unfiltered) ──────────────────────────────────
    const [{ count: total }, { count: unresolvedCount }] = await Promise.all([
      admin.from("error_logs").select("*", { count: "exact", head: true }),
      admin.from("error_logs").select("*", { count: "exact", head: true }).eq("resolved", false),
    ]);

    const { data: statRows } = await admin
      .from("error_logs")
      .select("source, severity");

    const bySource: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    statRows?.forEach((r: any) => {
      const s = r.source ?? "unknown";
      const sev = r.severity ?? "unknown";
      bySource[s] = (bySource[s] ?? 0) + 1;
      bySeverity[sev] = (bySeverity[sev] ?? 0) + 1;
    });

    return NextResponse.json({
      ok: true,
      errors: errors ?? [],
      stats: {
        total: total ?? 0,
        unresolvedCount: unresolvedCount ?? 0,
        bySource,
        bySeverity,
      },
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch error logs" }, { status: 500 });
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
    const { errorId, resolved } = body ?? {};

    if (!errorId || typeof errorId !== "string") {
      return NextResponse.json({ error: "errorId is required" }, { status: 400 });
    }
    if (typeof resolved !== "boolean") {
      return NextResponse.json({ error: "resolved must be a boolean" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient() as any;
    const { error } = await admin
      .from("error_logs")
      .update({ resolved })
      .eq("id", errorId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update error log" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { source, severity, message, stack, metadata } = body ?? {};

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const finalSource = typeof source === "string" && source.trim() ? source.trim().slice(0, 100) : "api";
    const finalSeverity =
      typeof severity === "string" && VALID_SEVERITIES.includes(severity) ? severity : "error";

    const admin = createSupabaseAdminClient() as any;
    const { data, error } = await admin
      .from("error_logs")
      .insert({
        source: finalSource,
        severity: finalSeverity,
        message: message.slice(0, 5000),
        stack: typeof stack === "string" ? stack.slice(0, 10000) : null,
        metadata: metadata && typeof metadata === "object" ? metadata : null,
        resolved: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, error: data });
  } catch {
    return NextResponse.json({ error: "Failed to log error" }, { status: 500 });
  }
}
