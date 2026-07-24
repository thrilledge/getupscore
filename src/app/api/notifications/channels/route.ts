import fs from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * Shared: Get current user ID from Supabase auth
 */
async function getUserId(): Promise<string> {
  const supabase = await createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error("User not authenticated");
  }

  return user.id;
}

/**
 * Shared: Local file system cache for Slack OAuth state
 */
async function cacheSlackOAuthState(state: string, data: any): Promise<void> {
  try {
    const cacheDir = path.join(process.cwd(), ".cache", "slack");

    await fs.mkdir(cacheDir, { recursive: true });

    const filePath = path.join(cacheDir, `${state}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("[Slack OAuth Cache] Write error:", error);
  }
}

/**
 * Shared: Read Slack OAuth state from cache
 */
async function getSlackOAuthState(state: string): Promise<any | null> {
  try {
    const filePath = path.join(process.cwd(), ".cache", "slack", `${state}.json`);
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
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
      return new Response(
        JSON.stringify({ error: "channel_type is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = await getUserId();

    if (channel_type === "slack") {
      const state = nanoid();
      const redirect_uri = env.SITE_URL || "http://localhost:3000";

      const oauthData = {
        user_id: userId,
        channel_type,
        name: name || "Slack Notifications",
        config: { ...config, redirect_uri },
        state,
        created_at: Date.now(),
      };

      await cacheSlackOAuthState(state, oauthData);

      const slackAuthUrl = `https://slack.com/oauth/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=incoming-webhook,chat:write,channels:read,users:read&state=${state}&redirect_uri=${redirect_uri}&response_type=code`;

      return new Response(
        JSON.stringify({ auth_url: slackAuthUrl, state, oauth_data: oauthData }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const sanitizedName = name || `${channel_type} Notifications`;
    const sanitizedConfig = config || {};

    const supabase = await createSupabaseAdminClient();
    const { data, error: insertError } = await supabase
      .from("notification_channels")
      .insert({
        user_id: userId,
        name: sanitizedName,
        type: channel_type,
        config: sanitizedConfig,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Channels] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create channel" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        id: data.id,
        message: "Channel created successfully",
        channel_type,
        name: sanitizedName,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Channels] Error:", err);
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
