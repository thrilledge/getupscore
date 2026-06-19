import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/extension/filters
 * Get the user's active job filters.
 *
 * Headers: Authorization: Bearer <token>
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user_id as string;

  try {
    const supabase = await createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("job_filters")
      .select("id, name, keywords, is_active, created_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Extension Filters] Query error:", error);
      return NextResponse.json(
        { error: "Failed to load filters" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      filters: data || [],
    });
  } catch (err) {
    console.error("[Extension Filters] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
