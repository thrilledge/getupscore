import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user_id as string;

  try {
    const supabase = createSupabaseAdminClient();

    const { count: savedJobs } = await supabase
      .from("saved_jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: totalProposals } = await supabase
      .from("proposals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: totalAnalyses } = await supabase
      .from("job_analyses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: activeFilters } = await supabase
      .from("job_filters")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true);

    return NextResponse.json({
      savedJobs: savedJobs ?? 0,
      totalProposals: totalProposals ?? 0,
      totalAnalyses: totalAnalyses ?? 0,
      activeFilters: activeFilters ?? 0,
    });
  } catch (err: any) {
    console.error("[Extension Analytics] Error:", err.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
