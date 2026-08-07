/**
 * Extension API authentication utility.
 * Validates the Authorization Bearer header and returns the user ID.
 * Accepts both legacy per-device API tokens and Supabase session JWTs
 * (extension sign-in with the dashboard account).
 */
import { resolveUserIdFromBearer } from "@/lib/supabase/verify-bearer";

export type AuthResult =
  | { user_id: string; error?: undefined; status?: undefined }
  | { user_id?: undefined; error: string; status: number };

/**
 * Validate the Bearer token from the request's Authorization header.
 */
export async function authenticateRequest(
  request: Request
): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", status: 401 };
  }

  const token = authHeader.slice(7).trim();

  try {
    const userId = await resolveUserIdFromBearer(token);
    if (!userId) {
      return { error: "Invalid or expired token", status: 401 };
    }
    return { user_id: userId };
  } catch (err) {
    console.error("[Extension Auth] Error:", err);
    return { error: "Authentication service unavailable", status: 500 };
  }
}
