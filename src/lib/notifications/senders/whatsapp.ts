/**
 * WhatsApp notification sender via a self-hosted OpenWA gateway.
 *
 * Config: {
 *   phone: string;      // recipient phone, international digits
 *   session_id: string; // OpenWA session ID (uuid) to send from
 * }
 *
 * The OpenWA base URL + API key are read from the SERVER env at send time
 * (OPENWA_BASE_URL / OPENWA_API_KEY) — never stored per-channel. This keeps
 * the master key out of the database and lets each product deployment set
 * its own gateway.
 *
 * Config may also carry overridden base_url/api_key for legacy channels, but
 * the env always wins for new ones.
 */
export interface WhatsAppConfig {
  phone: string;
  base_url?: string;
  session_id: string;
  api_key?: string;
}

export interface WhatsAppPayload {
  text: string;
}

const REQUEST_TIMEOUT_MS = 10_000;

export async function sendWhatsApp(
  config: WhatsAppConfig,
  payload: WhatsAppPayload
): Promise<{ ok: boolean; error?: string }> {
  if (!config.phone || !config.session_id) {
    return { ok: false, error: "WhatsApp channel is missing phone/session" };
  }

  // Gateway connection always comes from server env; optional per-channel
  // overrides exist only for migration of legacy rows.
  const baseUrl = (config.base_url ?? process.env.OPENWA_BASE_URL ?? "").replace(
    /\/+$/,
    ""
  );
  const apiKey = config.api_key ?? process.env.OPENWA_API_KEY ?? "";
  if (!baseUrl || !apiKey) {
    return { ok: false, error: "OpenWA gateway is not configured" };
  }

  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return { ok: false, error: "Invalid OpenWA base URL" };
  }

  if (base.protocol !== "http:" && base.protocol !== "https:") {
    return { ok: false, error: "OpenWA base URL must be http(s)" };
  }

  const chatId = `${config.phone.replace(/\D/g, "")}@c.us`;
  // Preserve any subpath in base_url (e.g. /openwa) — a leading "/" in the joined
  // path would discard it. Append a relative path to the base pathname instead.
  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  const endpoint = new URL(
    `${basePath}api/sessions/${encodeURIComponent(config.session_id)}/messages/send-text`,
    base
  );

  try {
    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ chatId, text: payload.text }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      // Never echo the remote response body — it could contain internals.
      return { ok: false, error: `OpenWA returned ${response.status}` };
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return {
      ok: false,
      error:
        err instanceof Error && err.name === "TimeoutError"
          ? "OpenWA request timed out"
          : message || "OpenWA request failed",
    };
  }
}