import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { isSessionReachable } from "@/lib/whatsapp/openwa-client";
import crypto from "crypto";

/** Returns the Slack state-signing secret, or null when Slack is not configured. */
function getSlackStateSecret(): string | null {
  return env.SLACK_SIGNING_SECRET || env.SLACK_CLIENT_SECRET || null;
}

function createSignedState(data: Record<string, unknown>): string | null {
  const secret = getSlackStateSecret();
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySignedState(state: string): Record<string, unknown> | null {
  try {
    const [payload, signature] = state.split(".");
    if (!payload || !signature) return null;
    const secret = getSlackStateSecret();
    if (!secret) return null;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
    if (signature !== expected) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { channel_type, name, config } = body;

    if (!channel_type) {
      return Response.json({ error: "channel_type is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (channel_type === "slack") {
      const state = createSignedState({
        user_id: user.id,
        channel_type,
        name: name || "Slack Notifications",
      });

      if (!state) {
        return Response.json(
          { error: "Slack is not configured on the server" },
          { status: 500 }
        );
      }

      const redirectUri = `${env.SITE_URL.replace(/\/+$/, "")}/api/notifications/channels/callback`;

      const scope = "incoming-webhook,chat:write,channels:read,users:read";
      const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=${scope}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

      return Response.json({ auth_url: slackAuthUrl, state });
    }

    const sanitizedName = name || `${channel_type} Notifications`;
    let sanitizedConfig = config || {};

    // WhatsApp gateway credentials are server-side config — never ask the
    // user for them. Resolve the real session UUID (OpenWA only accepts the
    // id, not the session name); the API key + base URL stay env-only (read
    // at send time) so the master key never hits the DB.
    if (channel_type === "whatsapp") {
      const sessionCheck = await isSessionReachable(
        env.OPENWA_SESSION_ID || "upscore"
      );
      sanitizedConfig = {
        phone: sanitizedConfig.phone ?? "",
        session_id:
          sessionCheck.ok && sessionCheck.session.id
            ? sessionCheck.session.id
            : env.OPENWA_SESSION_ID || "upscore",
      };
    }

    const admin = createSupabaseAdminClient();
    const { data, error: insertError } = await admin
      .from("notification_channels")
      .insert({
        user_id: user.id,
        name: sanitizedName,
        type: channel_type,
        config: sanitizedConfig,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Channels] Insert error:", insertError);
      return Response.json({ error: "Failed to create channel" }, { status: 500 });
    }

    return Response.json({
      id: data.id,
      message: "Channel created successfully",
      channel_type,
      name: sanitizedName,
    });
  } catch (err) {
    console.error("[Channels] Error:", err);
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
