import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Check if a user has admin privileges.
 * Uses the admin client to read app_metadata.is_admin from auth.users.
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user) return false;
    return data.user.app_metadata?.is_admin === true;
  } catch {
    return false;
  }
}

/**
 * Express middleware-style guard for admin API routes.
 * Returns { authorized: true, userId } or { authorized: false, response }.
 */
export async function requireAdmin(user: { id: string } | null): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; response: Response }
> {
  if (!user) {
    return {
      authorized: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const admin = await isUserAdmin(user.id);
  if (!admin) {
    return {
      authorized: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { authorized: true, userId: user.id };
}
