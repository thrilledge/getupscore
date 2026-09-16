/**
 * OpenWA API client — thin wrapper for the shared product WhatsApp session.
 *
 * Multi-product design: every product deployment defines its own env vars
 * (OPENWA_BASE_URL + OPENWA_API_KEY + OPENWA_SESSION_ID) pointing at the
 * OpenWA instance/session it should send from. The real session ID is stored
 * per notification channel; the master key stays server-side only.
 */

export const OPENWA_SESSION_ID =
  process.env.OPENWA_SESSION_ID ?? "upscore";

export interface OpenWASession {
  id: string;
  name: string;
  status: string;
  phone: string | null;
  pushName: string | null;
  connectedAt: string | null;
  engineLoaded: boolean;
}

const TIMEOUT_MS = 15_000;

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-API-Key": process.env.OPENWA_API_KEY ?? "",
  };
}

async function waFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const base_url = process.env.OPENWA_BASE_URL;
  if (!base_url || !process.env.OPENWA_API_KEY) {
    return { ok: false, error: "OpenWA not configured (OPENWA_BASE_URL / OPENWA_API_KEY missing)" };
  }
  const url = `${base_url.replace(/\/+$/, "")}${path}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: { ...headers(), ...init?.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: `OpenWA ${res.status}` };
    }
    return { ok: true, data: body as T };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return {
      ok: false,
      error:
        err instanceof Error && err.name === "TimeoutError"
          ? "OpenWA request timed out"
          : message || "OpenWA unreachable",
    };
  }
}

/** Get status of a session by its ID. */
export async function getSessionStatus(
  sessionId: string
): Promise<{ ok: true; session: OpenWASession } | { ok: false; error: string }> {
  const r = await waFetch<OpenWASession>(
    `/api/sessions/${encodeURIComponent(sessionId)}`
  );
  return r.ok ? { ok: true, session: r.data } : r;
}

/** Resolve a session by its stable name — returns the real ID too. */
export async function findSessionByName(
  sessionName: string
): Promise<{ ok: true; session: OpenWASession | null } | { ok: false; error: string }> {
  const r = await waFetch<OpenWASession | OpenWASession[]>(
    `/api/sessions?name=${encodeURIComponent(sessionName)}`
  );
  if (!r.ok) return r;
  const data = r.data;
  const session = Array.isArray(data) ? data[0] ?? null : data ?? null;
  return { ok: true, session };
}

/** Sanity-check that the shared session exists and is connected. */
export async function isSessionReachable(
  sessionName: string
): Promise<{ ok: true; session: OpenWASession; connected: boolean } | { ok: false; error: string }> {
  const r = await findSessionByName(sessionName);
  if (!r.ok) return r;
  if (!r.session) {
    return { ok: true, session: {} as OpenWASession, connected: false };
  }
  return { ok: true, session: r.session, connected: r.session.status === "ready" };
}

/** Send a text message through the shared product session. */
export async function sendText(
  sessionId: string,
  chatId: string,
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await waFetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`,
    {
      method: "POST",
      body: JSON.stringify({ chatId, text }),
    }
  );
  return r.ok ? { ok: true } : r;
}