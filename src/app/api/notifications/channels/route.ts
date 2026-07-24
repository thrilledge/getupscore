import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import crypto from "crypto";

/**
 * Create a signed state token that encodes user_id + channel info.
 * No server-side storage needed — works on Vercel serverless.
 */
function createSignedState(data: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const secret = env.SLACK_SIGNING_SECRET || env.SLACK_CLIENT_SECRET || "fallback";
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Verify and decode a signed state token.
 */
function verifySignedState(state: string): Record<string, unknown> | null {
  try {
    const [payload, signature] = state.split(".");
    if (!payload || !signature) return null;
    const secret = env.SLACK_SIGNING_SECRET || env.SLACK_CLIENT_SECRET || "fallback";
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
    if (signature !== expected) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

/**
 * POST /api/notifications/channels
 *
 * Add a new notification channel for the current user.
 * For Slack: initiate OAuth flow; for others: create directly.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { channel_type, name, config } = body;

    if (!channel_type) {
      return Response.json({ error: "channel_type is required" }, { status: 400 });
    }

    const supabase = await createSupabaseAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (channel_type === "slack") {
      const redirectUri = `${env.SITE_URL}/api/notifications/channels/callback`;

      const state = createSignedState({
        user_id: user.id,
        channel_type,
        name: name || "Slack Notifications",
        config: config || {},
      });

      const scope = "incoming-webhook,chat:write,channels:read,users:read";
      const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=${scope}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

      return Response.json({ auth_url: slackAuthUrl, state });
    }

    const sanitizedName = name || `${channel_type} Notifications`;
    const sanitizedConfig = config || {};

    const { data, error: insertError } = await supabase
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

export { verifySignedState };
