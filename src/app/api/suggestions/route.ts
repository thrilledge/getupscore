import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: Request) {
  // Suggestions power filter forms — require a signed-in user so the
  // "keywords" source can be scoped to that user's own filters instead of
  // exposing every user's saved search terms.
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
    if (type === "skills") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (admin as any)
        .from("jobs")
        .select("skills")
        .not("skills", "is", null)
        .limit(1000);

      if (error) throw error;

      const all = new Set<string>();
      for (const row of (data || []) as Array<{skills: string[] | null}>) {
        for (const s of row.skills || []) {
          if (s.toLowerCase().includes(q.toLowerCase())) all.add(s);
        }
      }
      const sorted = Array.from(all).sort().slice(0, limit);
      return NextResponse.json({ suggestions: sorted });
    }

    if (type === "keywords") {
      // Only the authenticated user's own filter keywords — never everyone's.
      const { data: filters, error } = await admin
        .from("job_filters")
        .select("keywords")
        .eq("user_id", user.id)
        .not("keywords", "is", null);

      if (error) throw error;

      const { data: titleWords, error: titleError } = await admin
        .from("jobs")
        .select("title")
        .ilike("title", `%${q}%`)
        .limit(200);

      if (titleError) throw titleError;

      const all = new Set<string>();
      for (const row of filters) {
        for (const kw of (row.keywords as string[]) || []) {
          if (kw.toLowerCase().includes(q.toLowerCase())) all.add(kw);
        }
      }
      for (const row of titleWords) {
        const words = (row.title as string).split(/[\s,;]+/);
        for (const w of words) {
          if (w.toLowerCase().includes(q.toLowerCase()) && w.length > 2) all.add(w);
        }
      }
      const sorted = Array.from(all).sort().slice(0, limit);
      return NextResponse.json({ suggestions: sorted });
    }

    if (type === "countries") {
      const { data, error } = await admin
        .from("jobs")
        .select("client_country")
        .not("client_country", "is", null)
        .limit(500);

      if (error) throw error;

      const all = new Set<string>();
      for (const row of data) {
        const c = row.client_country as string;
        if (c.toLowerCase().includes(q.toLowerCase())) all.add(c);
      }
      const sorted = Array.from(all).sort().slice(0, limit);
      return NextResponse.json({ suggestions: sorted });
    }

    return NextResponse.json({ suggestions: [] });
  } catch (err: any) {
    console.error("[Suggestions API] Error:", err.message);
    return NextResponse.json({ suggestions: [] });
  }
}
