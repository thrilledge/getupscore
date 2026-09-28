import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { cached, TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

type Scope = "all" | "filters" | "custom";

type JsonObject = Record<string, unknown>;

function normalizePayload(d: JsonObject | null | undefined): JsonObject | null {
  if (!d || typeof d !== "object") return d ?? null;

  for (const key of [
    "history",
    "skills",
    "skillTrend",
    "skillPairs",
    "budgetBands",
    "hourlyBands",
    "categories",
    "subcategories",
    "geography",
  ]) {
    if (!Array.isArray(d[key])) d[key] = [];
  }

  const timing = d.timing;
  if (timing && typeof timing === "object" && !Array.isArray(timing)) {
    const t = timing as JsonObject;
    if (!Array.isArray(t.byDay)) t.byDay = [];
    if (!Array.isArray(t.byHour)) t.byHour = [];
  }

  const clients = d.clients;
  if (clients && typeof clients === "object" && !Array.isArray(clients)) {
    const c = clients as JsonObject;
    if (c.tiers && !Array.isArray(c.tiers)) c.tiers = [];
  }

  return d;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = parseInt(searchParams.get("days") ?? "30", 10);
  const days = [7, 30].includes(raw) ? raw : 30;

  const rawScope = (searchParams.get("scope") ?? "all").toLowerCase();
  const scope: Scope = ["all", "filters", "custom"].includes(rawScope)
    ? (rawScope as Scope)
    : "all";
  const filterIdsParam = searchParams.get("filter_ids") ?? "";

  const supabaseAdmin = createSupabaseAdminClient();

  // null => global view (all jobs); [] => no user filters matched
  let filterIds: string[] | null = null;
  let currentUserId: string | null = null;

  if (scope !== "all") {
    const serverClient = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await serverClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    currentUserId = user.id;

    if (scope === "filters") {
      // All of the user's active filters (OR semantics)
      const { data: filters } = await supabaseAdmin
        .from("job_filters")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true);
      filterIds = (filters ?? []).map((f) => f.id);
    } else {
      // Custom selection — only ids owned by this user
      const requested = filterIdsParam
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      if (requested.length > 0) {
        const { data: owned } = await supabaseAdmin
          .from("job_filters")
          .select("id")
          .eq("user_id", user.id)
          .in("id", requested);

        const ownedSet = new Set((owned ?? []).map((f) => f.id));
        filterIds = requested.filter((id) => ownedSet.has(id));
      }
    }
  }

  // Trends only change when the feed syncs (every 5 min) — cache the heavy
  // aggregation so 7d/30d switching is instant instead of a fresh RPC.
  const cacheKey = `mt:${days}:${scope}${currentUserId ? `:${currentUserId}` : ""}:${scope === "custom" ? (filterIds ?? []).join(",") : ""}`;

  let d: JsonObject | null;
  try {
    d = await cached<JsonObject | null>(cacheKey, TTL.TRENDS, async () => {
      const { data, error } = await supabaseAdmin.rpc(
        "get_market_trends_filtered",
        {
          p_days: days,
          p_filter_ids: filterIds && filterIds.length > 0 ? filterIds : [],
        }
      );

      if (error) throw error;
      return normalizePayload(data as JsonObject | null | undefined) ?? null;
    });
  } catch (err: any) {
    console.error("[Market Trends] Query error:", err?.message);
    return NextResponse.json(
      { error: err?.message || "Failed to load market trends" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ...(d ?? {}),
    applied: {
      scope,
      filterCount: filterIds?.length ?? 0,
    },
  });
}