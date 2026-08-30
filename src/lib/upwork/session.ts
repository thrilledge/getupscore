/**
 * Server helpers for reading a user's active Upwork connection, decrypting its
 * token, and transparently refreshing it when near/at expiry (writing the new
 * encrypted payload back to the DB).
 */
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { decodeTokenPayload, encodeTokenPayload, type UpworkTokenPayload } from "@/lib/upwork/crypto";
import { refreshAccessToken } from "@/lib/upwork/oauth";

export interface ActiveConnection {
  id: string;
  orgUid: string;
  upworkUserUid: string;
  displayName: string | null;
  clientRef: string | null;
  lastSyncedAt: string | null;
}

export interface SessionContext extends ActiveConnection {
  token: UpworkTokenPayload;
}

/** Fetch and decrypt the user's active connection token, refreshing if needed. */
export async function getUpworkSession(
  userId: string
): Promise<SessionContext | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("upwork_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("upwork session lookup error", error);
    return null;
  }
  if (!data) return null;

  const token = decodeTokenPayload({
    tokenEnc: data.token_enc as string,
    tokenIv: data.token_iv as string,
    tokenTag: data.token_tag as string,
  });

  const refreshWindow = 5 * 60 * 1000; // 5 min
  if (token.expires_at - Date.now() < refreshWindow) {
    try {
      const clientId = data.client_ref as string;
      const refreshed = await refreshAccessToken(token.refresh_token, clientId);
      const updated: UpworkTokenPayload = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? token.refresh_token,
        expires_at: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
        token_type: refreshed.token_type,
        scope: refreshed.scope,
      };
      const enc = encodeTokenPayload(updated);
      await admin
        .from("upwork_connections")
        .update({
          token_enc: enc.tokenEnc,
          token_iv: enc.tokenIv,
          token_tag: enc.tokenTag,
          key_version: 1,
        })
        .eq("id", data.id);
      token.access_token = updated.access_token;
      token.expires_at = updated.expires_at;
    } catch (e) {
      console.error("upwork token refresh failed", e);
    }
  }

  return {
    id: data.id as string,
    orgUid: data.org_uid as string,
    upworkUserUid: data.upwork_user_uid as string,
    displayName: (data.display_name as string | null) ?? null,
    clientRef: (data.client_ref as string | null) ?? null,
    lastSyncedAt: (data.last_synced_at as string | null) ?? null,
    token,
  };
}
