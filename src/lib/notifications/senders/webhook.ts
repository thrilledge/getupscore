/**
 * Generic webhook notification sender.
 *
 * Config: { url: string; method?: "GET" | "POST" | "PUT" }
 */
export interface WebhookConfig {
  url: string;
  method?: "GET" | "POST" | "PUT";
}

export interface WebhookPayload {
  [key: string]: unknown;
}

export async function sendWebhook(
  config: WebhookConfig,
  payload: WebhookPayload
): Promise<{ ok: boolean; error?: string }> {
  if (!config.url) {
    return { ok: false, error: "Webhook URL not configured" };
  }

  const method = config.method || "POST";

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (method !== "GET") {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(config.url, fetchOptions);

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      return { ok: false, error: `Webhook returned ${response.status}: ${text}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
