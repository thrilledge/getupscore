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

    // Slack returns HTTP 200 with {"ok":true} on success, and 200 with
    // {"ok":false,"error":"..."} for invalid/expired webhooks. Checking the
    // HTTP status alone would report a dead webhook as "working".
    const body = await response.json().catch(() => null);
    if (!response.ok || !body || body.ok !== true) {
      const reason =
        body?.error || (response.ok ? "Slack returned ok:false" : `Slack returned ${response.status}`);
      return { ok: false, error: reason };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
