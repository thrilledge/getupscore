/**
 * Extension API authentication utility.
 * Validates Bearer token from Authorization header and returns the user ID.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type AuthResult =
  | { user_id: string; error?: undefined; status?: undefined }
  | { user_id?: undefined; error: string; status: number };

/**
 * Validate the Bearer token from the request's Authorization header.
 * Looks up the token in the api_tokens table using the admin client.
 */
export async function authenticateRequest(
  request: Request
): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", status: 401 };
  }

  const token = authHeader.slice(7).trim();
  if (!token || token.length < 16) {
    return { error: "Invalid token format", status: 401 };
  }

  try {
    const supabase = await createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("api_tokens")
      .select("user_id")
      .eq("token", token)
      .single();

    if (error || !data || !data.user_id) {
      return { error: "Invalid or expired token", status: 401 };
    }

    // Update last_used_at asynchronously (don't block the request)
    supabase
      .from("api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token", token)
      .then();

    return { user_id: data.user_id };
  } catch (err) {
    console.error("[Extension Auth] Error:", err);
    return { error: "Authentication service unavailable", status: 500 };
  }
}
