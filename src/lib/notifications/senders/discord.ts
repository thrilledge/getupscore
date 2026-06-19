/**
 * Discord notification sender via Webhooks.
 *
 * Config: { webhook_url: string }
 */
export interface DiscordConfig {
  webhook_url: string;
}

export interface DiscordPayload {
  content: string;
  embeds?: {
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
  }[];
}

export async function sendDiscord(
  config: DiscordConfig,
  payload: DiscordPayload
): Promise<{ ok: boolean; error?: string }> {
  if (!config.webhook_url) {
    return { ok: false, error: "Discord webhook URL not configured" };
  }

  try {
    const response = await fetch(config.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: payload.content,
        embeds: payload.embeds,
      }),
    });

    // Discord returns 204 No Content on success
    if (response.status !== 204 && !response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      return { ok: false, error: `Discord returned ${response.status}: ${text}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
