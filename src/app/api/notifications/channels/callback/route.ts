import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { verifySignedState } from "../route";

const SITE = () => env.SITE_URL || "http://localhost:3000";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const slackError = searchParams.get("error");

  if (slackError) {
    return NextResponse.redirect(
      `${SITE()}/channels?error=slack_denied`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE()}/channels?error=missing_params`
    );
  }

  const oauthData = verifySignedState(state) as {
    user_id: string;
    channel_type: string;
    name: string;
    config: Record<string, unknown>;
  } | null;

  if (!oauthData) {
    return NextResponse.redirect(
      `${SITE()}/channels?error=invalid_state`
    );
  }

  try {
    const redirectUri = `${SITE()}/api/notifications/channels/callback`;

    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.ok) {
      console.error("[Slack Callback] Token exchange failed:", tokenData.error);
      return NextResponse.redirect(
        `${SITE()}/channels?error=token_exchange_failed`
      );
    }

    const webhookUrl = tokenData.incoming_webhook?.url;
    if (!webhookUrl) {
      console.error("[Slack Callback] No webhook URL in response");
      return NextResponse.redirect(
        `${SITE()}/channels?error=no_webhook`
      );
    }

    const supabase = await createSupabaseAdminClient();
    const { error } = await supabase.from("notification_channels").insert({
      user_id: oauthData.user_id,
      name: oauthData.name,
      type: "slack",
      config: {
        webhook_url: webhookUrl,
        channel_id: tokenData.incoming_webhook?.channel_id || null,
        channel_name: tokenData.incoming_webhook?.channel_name || null,
        bot_user_id: tokenData.bot_user_id || null,
        team_name: tokenData.team?.name || null,
      },
      is_active: true,
    });

    if (error) {
      console.error("[Slack Callback] DB insert error:", error);
      return NextResponse.redirect(
        `${SITE()}/channels?error=save_failed`
      );
    }

    return NextResponse.redirect(
      `${SITE()}/channels?success=slack_connected`
    );
  } catch (err) {
    console.error("[Slack Callback] Error:", err);
    return NextResponse.redirect(
      `${SITE()}/channels?error=oauth_failed`
    );
  }
}
