import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cached, cacheInvalidate, TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Every FavoriteButton on a page mounts and hits this endpoint — cache the
    // full list so 20+ cards cost one auth round-trip + one Redis read.
    const favorites = await cached(`favorites:list:${user.id}`, TTL.FAVORITES, async () => {
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("job_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    });

    return NextResponse.json({ favorites: favorites ?? [] });
  } catch (err: any) {
    console.error("[Favorites API] Query error:", err.message);
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { jobId } = await request.json();
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("saved_jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await cacheInvalidate(`favorites:list:${user.id}`);
    return NextResponse.json({ saved: false });
  }

  const { error } = await supabase
    .from("saved_jobs")
    .insert({ user_id: user.id, job_id: jobId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await cacheInvalidate(`favorites:list:${user.id}`);
  return NextResponse.json({ saved: true });
}
