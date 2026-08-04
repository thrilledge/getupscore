import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = parseInt(searchParams.get("days") ?? "30", 10);
  const days = [7, 30, 90].includes(raw) ? raw : 30;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("get_market_trends", { p_days: days });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
