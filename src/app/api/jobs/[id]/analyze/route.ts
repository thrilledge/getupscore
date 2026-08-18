import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { analyzeJob } from "@/lib/jobs/analyze";
import { checkRateLimit, analysisRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit per user
  const { success } = await checkRateLimit(analysisRateLimit, user.id);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await params;

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const analysis = await analyzeJob(admin, job, id, user.id);

    return NextResponse.json({
      ok: true,
      analysis,
    });
  } catch {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
