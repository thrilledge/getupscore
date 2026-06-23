import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: saved, error: savedError } = await supabase
    .from("saved_jobs")
    .select(`
      id,
      created_at,
      job:jobs (
        id,
        upwork_job_id,
        title,
        url,
        budget,
        hourly_min,
        hourly_max,
        job_type,
        contractor_tier,
        skills,
        client_country,
        posted_at
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (savedError) {
    return NextResponse.json({ error: savedError.message }, { status: 500 });
  }

  const jobs = (saved || []).map((s: any) => ({
    ...s.job,
    saved_at: s.created_at,
  }));

  return NextResponse.json({ jobs });
}
