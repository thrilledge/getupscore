import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = parseInt(searchParams.get("days") ?? "30", 10);
  const days = [7, 30].includes(raw) ? raw : 30;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("get_market_trends", { p_days: days });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // PostgreSQL json_agg() returns null when no rows match.
  // Ensure array fields are always [] so client components can safely .reduce() etc.
  const d = data as Record<string, any> | null;
  if (d && typeof d === "object") {
    for (const key of ["history", "skills", "skillTrend", "skillPairs", "budgetBands", "hourlyBands", "categories", "subcategories", "geography"]) {
      if (!Array.isArray(d[key])) d[key] = [];
    }
    if (d.timing) {
      if (!Array.isArray(d.timing.byDay)) d.timing.byDay = [];
      if (!Array.isArray(d.timing.byHour)) d.timing.byHour = [];
    }
    if (d.clients?.tiers && !Array.isArray(d.clients.tiers)) d.clients.tiers = [];
  }

  return NextResponse.json(d);
}
