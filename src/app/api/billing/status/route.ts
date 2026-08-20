import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveUserIdFromBearer } from "@/lib/supabase/verify-bearer";

export async function GET(request: Request) {
  let userId: string | null = null;

  // Support both cookie auth (dashboard) and Bearer token (extension)
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    userId = await resolveUserIdFromBearer(authHeader.slice(7).trim());
  } else {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) userId = user.id;
  }

  if (!userId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: rawData } = await admin.rpc("check_subscription", {
    p_user_id: userId,
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
