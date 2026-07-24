import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import fs from "fs/promises";
import path from "path";

async function getSlackOAuthState(state: string): Promise<any | null> {
  const cacheDir = path.join(process.cwd(), ".cache", "slack");
  const filePath = path.join(cacheDir, `${state}.json");
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function deleteSlackOAuthState(state: string): Promise<void> {
  const cacheDir = path.join(process.cwd(), ".cache", "slack");
  const filePath = path.join(cacheDir, `${state}.json");
  try {
    await fs.unlink(filePath);
  } catch {
  }
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/notifications?error=missing_params`
    );
  }

  const oauthData = await getSlackOAuthState(state);
  if (!oauthData) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/notifications?error=invalid_state`
    );
  }

  try {
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.ok) {
      throw new Error(`Slack OAuth failed: ${tokenData.error}`);
    }

    const webhookUrl = tokenData.incoming_webhook?.url || tokenData.webhook_url || null;
    if (!webhookUrl) {
      throw new Error("Slack OAuth did not return a webhook URL");
    }

    const supabase = await createSupabaseAdminClient();
    const { error } = await supabase.from("notification_channels").insert({
      user_id: oauthData.user_id,
      name: oauthData.name,
      type: oauthData.channel_type,
      config: {
        webhook_url: webhookUrl,
        channel_id: tokenData.incoming_webhook?.channel_id || null,
        bot_user_id: tokenData.bot_user_id || null,
      },
      is_active: true,
    });

    if (error) {
      console.error("[Channels Callback] DB insert error:", error);
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/notifications?error=save_failed`
      );
    }

    await deleteSlackOAuthState(state);

    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/notifications?success=slack_connected`
    );
  } catch (err) {
    console.error("[Channels Callback] Error:", err);
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/notifications?error=oauth_failed`
    );
  }
}
