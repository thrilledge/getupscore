import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { cached, TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "skills";
  const q = searchParams.get("q")?.trim() || "";
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "10")));

  if (!q || q.length < 1) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const cacheKey = `sug:${type}:${q}:${limit}`;

    if (type === "skills") {
      // Use RPC — single query on PostgreSQL, no 1000-row client scan
      const suggestions = await cached(cacheKey, TTL.SUGGESTIONS, async () => {
        const { data, error } = await admin.rpc("get_skills_suggestions" as any, {
          p_query: q,
          p_limit: limit,
        } as any);
        if (error) throw error;
        return (Array.isArray(data) ? data : []) as string[];
      });
      return NextResponse.json({ suggestions });
    }

    if (type === "keywords") {
      const suggestions = await cached(cacheKey, TTL.SUGGESTIONS, async () => {
        // Only the authenticated user's own filter keywords
        const { data: filters, error } = await admin
          .from("job_filters")
          .select("keywords")
          .eq("user_id", user.id)
          .not("keywords", "is", null);

        if (error) throw error;

        const all = new Set<string>();
        for (const row of filters || []) {
          for (const kw of (row.keywords as string[]) || []) {
            if (kw.toLowerCase().includes(q.toLowerCase())) all.add(kw);
          }
        }
        return Array.from(all).sort().slice(0, limit);
      });
      return NextResponse.json({ suggestions });
    }

    if (type === "countries") {
      // Use RPC — single query, no 500-row client scan
      const suggestions = await cached(cacheKey, TTL.SUGGESTIONS, async () => {
        const { data, error } = await admin.rpc("get_countries_suggestions" as any, {
          p_query: q,
          p_limit: limit,
        } as any);
        if (error) throw error;
        return (Array.isArray(data) ? data : []) as string[];
      });
      return NextResponse.json({ suggestions });
    }

    return NextResponse.json({ suggestions: [] });
  } catch (err: any) {
    console.error("[Suggestions API] Error:", err.message);
    return NextResponse.json({ suggestions: [] });
  }
}
