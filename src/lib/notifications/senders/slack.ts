/**
 * Slack notification sender via Incoming Webhooks.
 *
 * Config: { webhook_url: string }
 */
export interface SlackConfig {
  webhook_url: string;
}

export interface SlackPayload {
  text: string;
  blocks?: unknown[];
}

export async function sendSlack(
  config: SlackConfig,
  payload: SlackPayload
): Promise<{ ok: boolean; error?: string }> {
  if (!config.webhook_url) {
    return { ok: false, error: "Slack webhook URL not configured" };
  }

  try {
    const response = await fetch(config.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: payload.text,
        blocks: payload.blocks,
        mrkdwn: true,
      }),
    });

    // Slack returns 200 OK with "ok: true" on success
    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      return { ok: false, error: `Slack returned ${response.status}: ${text}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
