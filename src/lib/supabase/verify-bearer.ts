import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Resolve the authenticated user from a Bearer token.
 *
 * Accepts two credential types so the extension can sign in with the same
 * account as the dashboard (Supabase session JWT) while legacy per-device
 * API tokens keep working:
 *   1. api_tokens table lookup (legacy "us_..." device tokens)
 *   2. Supabase session access_token (extension login)
 *
 * Returns the user_id, or null when the token is invalid.
 */
export async function resolveUserIdFromBearer(token: string): Promise<string | null> {
  if (!token || token.length < 16) return null;
  const supabase = createSupabaseAdminClient();

  // 1) Legacy per-device API token
  const { data, error } = await supabase
    .from("api_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (!error && data?.user_id) {
    supabase
      .from("api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token", token)
      .then();
    return data.user_id as string;
  }

  // 2) Supabase session JWT (extension login with dashboard account)
  try {
    const { data: userData, error: jwtError } = await supabase.auth.getUser(token);
    if (!jwtError && userData?.user?.id) {
      return userData.user.id;
    }
  } catch {
    // fall through
  }

  return null;
}
