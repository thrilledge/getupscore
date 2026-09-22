"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { nanoid } from "nanoid";
import type { UserPreferenceInsert, UserPreferenceUpdate } from "@/lib/supabase/database-types";

export type SettingsActionResult = {
  success: boolean;
  error?: string;
};

export type ApiTokenData = {
  id: string;
  token_preview: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
};

/**
 * Update the authenticated user's display name.
 */
export async function updateDisplayName(
  displayName: string
): Promise<SettingsActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const name = displayName.trim();
  if (!name || name.length > 100) {
    return { success: false, error: "Name must be between 1-100 characters." };
  }

  const { error } = await supabase.auth.updateUser({
    data: { display_name: name },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Generate a new API token for extension authentication.
 * The full token is returned only once on creation.
 */
export async function generateApiToken(
  name: string
): Promise<SettingsActionResult & { token?: string; id?: string }> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const deviceName = name.trim() || "Chrome Extension";
  const token = `us_${nanoid(48)}`;

  const adminClient = await createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("api_tokens")
    .insert({
      user_id: user.id,
      token,
      name: deviceName,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true, token, id: data.id };
}

/**
 * Revoke (delete) an API token.
 */
export async function revokeApiToken(
  tokenId: string
): Promise<SettingsActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const adminClient = await createSupabaseAdminClient();
  const { error } = await adminClient
    .from("api_tokens")
    .delete()
    .eq("id", tokenId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Get all API tokens for the current user.
 */
export async function getApiTokens(): Promise<
  (SettingsActionResult & { tokens?: ApiTokenData[] }) | never
> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const adminClient = await createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("api_tokens")
    .select("id, token, name, last_used_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    tokens: (data || []).map((t) => ({
      id: t.id,
      token_preview: `${t.token.slice(0, 12)}...`,
      name: t.name,
      last_used_at: t.last_used_at,
      created_at: t.created_at,
    })),
  };
}

/**
 * Send a password reset email to the authenticated user.
 */
export async function sendPasswordReset(): Promise<SettingsActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || !user.email) {
    return { success: false, error: "You must be signed in." };
  }

  // Build a valid post-reset redirect. APP_URL defaults to localhost in prod,
  // so fall back to the public SITE_URL when APP_URL is unset/local.
  const base =
    env.APP_URL && env.APP_URL !== "http://localhost:3000"
      ? env.APP_URL
      : env.SITE_URL;
  const redirectTo = base
    ? `${base.replace(/\/+$/, "")}/login`
    : undefined;

  // Network flaps to the self-hosted DB (db.getupscore.com:443) are transient —
  // retry once after a short pause so a single dropped connection isn't fatal.
  const email = user.email;
  const attemptReset = async () =>
    supabase.auth.resetPasswordForEmail(email, {
      ...(redirectTo ? { redirectTo } : {}),
    });

  let { error } = await attemptReset();
  if (error) {
    const status = (error as any)?.status ?? 0;
    const retryable =
      status >= 500 ||
      status === 0 ||
      error.name === "AuthRetryableFetchError" ||
      error.name === "FetchError";
    if (retryable) {
      await new Promise((r) => setTimeout(r, 2500));
      ({ error } = await attemptReset());
    }
  }

  if (error) {
    console.error("[settings] resetPasswordForEmail failed", JSON.stringify({
      email: user.email,
      redirectTo,
      name: error.name,
      message: error.message,
      status: (error as any)?.status,
      code: (error as any)?.code,
      __all: error,
    }, null, 2));
    // GoTrue can return an empty/opaque error — never surface "{}".
    const raw =
      typeof error.message === "string" ? error.message.trim() : "";
    const isOpaque =
      !raw || raw === "{}" || /^\{.+\}$/.test(raw);
    const message = isOpaque
      ? "Could not send the reset email. Please try again."
      : raw;

    return { success: false, error: message };
  }

  return { success: true };
}

export async function getPreferences(): Promise<
  SettingsActionResult & { preferences?: UserPreferenceInsert }
> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    preferences: data ?? {
      user_id: user.id,
      timezone: "UTC",
      notify_on_match: true,
      notify_on_proposal_status: true,
      notify_on_contract_updates: true,
      daily_digest: false,
      quiet_hours_start: null,
      quiet_hours_end: null,
    } as UserPreferenceInsert,
  };
}

export async function savePreferences(
  prefs: Partial<UserPreferenceUpdate>
): Promise<SettingsActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("user_preferences")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("user_preferences")
      .update(prefs)
      .eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await admin
      .from("user_preferences")
      .insert({ user_id: user.id, ...prefs } as UserPreferenceInsert);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}
