import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = createSupabaseAdminClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: rawData } = await supabase.rpc("check_subscription", {
    p_user_id: user.id,
  });

  const data = rawData as Record<string, unknown> | null;

  return Response.json({
    data: {
      plan: (data?.plan as string) ?? "free",
      is_paid: (data?.is_paid as boolean) ?? false,
      status: (data?.status as string) ?? "free",
      current_period_end: (data?.current_period_end as string) ?? null,
    },
  });
}
