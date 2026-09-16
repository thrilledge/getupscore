import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolve the authenticated user id from a request, supporting:
 *   - Supabase session cookie (browser flow)
 *   - Bearer <supabase_jwt>
 *   - Bearer <api_token> (from api_tokens table)
 *
 * Returns null when unauthenticated.
 */
export async function getAuthUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization") || "";

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const admin = createSupabaseAdminClient();
    const { data: { user } } = await admin.auth.getUser(token);
    if (user) return user.id;
    const { data } = await admin
      .from("api_tokens")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();
    return data?.user_id ?? null;
  }

  const serverClient = await createSupabaseServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  return user?.id ?? null;
}