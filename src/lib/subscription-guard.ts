import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Check if a user has an active paid subscription.
 * Returns null if paid, or a NextResponse error if free.
 */
export async function requirePaid(
  userId: string
): Promise<NextResponse | null> {
  const supabase = createSupabaseAdminClient();
  const { data: rawData } = await supabase.rpc("check_subscription", {
    p_user_id: userId,
  });

  const data = rawData as Record<string, unknown> | null;

  if (data?.is_paid) return null;

  return NextResponse.json(
    {
      error: "subscription_required",
      message: "This feature requires a Pro subscription.",
    },
    { status: 403 }
  );
}
