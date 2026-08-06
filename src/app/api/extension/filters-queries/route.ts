import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user_id as string;
  try {
    const supabase = await createSupabaseAdminClient();
    const { data: filters, error: filtersError } = await supabase
      .from("job_filters")
      .select(`*,
        search_queries (*)`)
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (filtersError) {
      return NextResponse.json({ error: "Failed to load filters" }, { status: 500 });
    }
    // Aggregate only the queries that belong to this user's own filters —
    // never every user's queries.
    const queries: any[] = [];
    for (const f of filters || []) {
      for (const sq of (f as any).search_queries || []) {
        queries.push(sq);
      }
    }
    return NextResponse.json({ filters: filters || [], queries });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
