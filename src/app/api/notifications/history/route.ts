import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, channel, status, created_at, sent_at, job_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const jobIds = [...new Set(data.map((n) => n.job_id))];
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title")
    .in("id", jobIds);

  const jobMap = new Map((jobs || []).map((j) => [j.id, j.title]));

  const notifications = data.map((n) => ({
    ...n,
    job_title: jobMap.get(n.job_id) || null,
  }));

  return NextResponse.json({ notifications });
}
