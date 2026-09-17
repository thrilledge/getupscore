export interface LLMProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  groqStyle?: boolean;
  extraHeaders?: Record<string, string>;
}

export type ProviderName = "profreemodels" | "groq";

export interface LLMChainOptions {
  /** Force a specific provider, skipping the default chain order. */
  provider?: ProviderName;
  maxAttemptsPerProvider?: number;
}

export type LlmErrorCode = "rate_limit" | "all_failed" | "no_providers";

/**
 * Typed error thrown by {@link chatCompletionWithRetry} so callers can render
 * a graceful, user-facing message instead of leaking raw provider JSON.
 *
 * - `rate_limit`  — every available key is rate-limited (usually Groq's daily
 *   token cap, which is shared across all keys in one Groq organization).
 * - `all_failed`  — every key failed for mixed/other reasons.
 * - `no_providers`— no API keys are configured at all.
 */
export class LlmError extends Error {
  code: LlmErrorCode;
  retryAfterSeconds?: number;
  constructor(message: string, code: LlmErrorCode, retryAfterSeconds?: number) {
    super(message);
    this.name = "LlmError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Provider chain: ProfreeModels (free pro-tier models) preferred, then
 * multiple Groq API keys, then Pollinations AI fallback.
 *
 * IMPORTANT: Groq enforces its token-per-day (TPD) limit per *organization*,
 * not per API key. Multiple keys created inside a single Groq account all draw
 * from the same daily quota, so they do NOT multiply capacity — they only help
 * when a per-minute (RPM/TPM) burst limit is hit. To actually raise the daily
 * ceiling, the keys in GROQ_API_KEYS must come from separate Groq accounts.
 *
 * Pollinations AI is appended as a free fallback — no auth needed, ~1 req/15s.
 *
 * Supports:
 * - PROFREEMODELS_API_KEY / PROFREEMODELS_MODEL — preferred analysis provider
 *   (free pro-tier GPT/Claude/GLM/Kimi models via ProfreeModels gateway).
 * - GROQ_API_KEYS: comma-separated list of API keys (preferred)
 * - GROQ_API_KEY: single API key (backward compatible)
 */
export function getProviderChain(_opts?: LLMChainOptions): LLMProvider[] {
  return buildAllProviders();
}

function buildAllProviders(): LLMProvider[] {
  const chain: LLMProvider[] = [];

  // Preferred: ProfreeModels free pro-tier models
  const pmKey = process.env.PROFREEMODELS_API_KEY;
  if (pmKey) {
    chain.push({
      name: "profreemodels",
      baseUrl: process.env.PROFREEMODELS_BASE_URL || "https://profreemodels.vercel.app/api/v1",
      apiKey: pmKey,
      model: process.env.PROFREEMODELS_MODEL || "claude-sonnet-5",
    });
  }

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
  const baseUrl = "https://api.groq.com/openai/v1";

  // Support multiple API keys (comma-separated)
  const keysEnv = process.env.GROQ_API_KEYS;
  if (keysEnv) {
    const keys = keysEnv.split(",").map((k) => k.trim()).filter(Boolean);
    keys.forEach((key, i) => {
      chain.push({
        name: `groq-${i + 1}`,
        baseUrl,
        apiKey: key,
        model,
        groqStyle: true,
      });
    });
  } else {
    // Fallback: single GROQ_API_KEY
    const singleKey = process.env.GROQ_API_KEY;
    if (singleKey) {
      chain.push({
        name: "groq",
        baseUrl,
        apiKey: singleKey,
        model,
        groqStyle: true,
      });
    }
  }

  return chain;
}

// ─── Load spreading & cooldown state (module-level, per server instance) ──────
//
// When a key returns 429 we stop hammering it: it's parked in a cooldown map
// until its rate window is likely to have recovered. Subsequent requests skip
// parked keys entirely, which (a) fails over instantly instead of re-probing
// dead keys and (b) spreads load so we don't always burn key #1 first.
const keyCooldownUntil = new Map<string, number>();
let rotationCursor = 0;

/** Parse "Please try again in 4m32.16s" / "in 12.5s" or a Retry-After header. */
function parseRetryAfterSeconds(body: string, headerVal: string | null): number | null {
  if (headerVal) {
    const n = parseInt(headerVal, 10);
    if (!Number.isNaN(n)) return n;
  }
  const m = body.match(/try again in\s+(?:(\d+)m)?\s*([\d.]+)\s*s/i);
  if (m) {
    const mins = m[1] ? parseInt(m[1], 10) : 0;
    const secs = m[2] ? parseFloat(m[2]) : 0;
    const total = Math.ceil(mins * 60 + secs);
    if (total > 0) return total;
  }
  return null;
}

/** How long to park a rate-limited key, based on the 429 body/header. */
function computeCooldownSeconds(body: string, retryAfterHeader: string | null): number {
  const parsed = parseRetryAfterSeconds(body, retryAfterHeader);
  const isDaily = /per day|tokens per day|\btpd\b|daily/i.test(body);
  if (parsed != null) {
    // Respect the provider's hint, but cap so a stale estimate can't park a
    // key for hours: 30 min for daily caps, 2 min for per-minute bursts.
    return Math.max(5, Math.min(parsed, isDaily ? 1800 : 120));
  }
  return isDaily ? 900 : 60;
}

/**
 * Returns providers that aren't currently cooling down, rotated so requests
 * don't always start at the same key. Also reports the soonest cooldown
 * expiry (used to tell the user when to retry if everything is parked).
 */
function availableProviders(chain: LLMProvider[]): {
  available: LLMProvider[];
  soonestRetrySeconds: number | null;
} {
  const now = Date.now();
  const available: LLMProvider[] = [];
  let soonestUntil: number | null = null;

  for (const p of chain) {
    const until = keyCooldownUntil.get(p.apiKey) ?? 0;
    if (until > now) {
      soonestUntil = soonestUntil == null ? until : Math.min(soonestUntil, until);
      continue;
    }
    if (until) keyCooldownUntil.delete(p.apiKey); // expired — clean up
    available.push(p);
  }

  let rotated = available;
  if (available.length > 1) {
    const start = rotationCursor % available.length;
    rotationCursor = (rotationCursor + 1) % available.length;
    rotated = [...available.slice(start), ...available.slice(0, start)];
  }

  return {
    available: rotated,
    soonestRetrySeconds:
      soonestUntil == null ? null : Math.max(1, Math.ceil((soonestUntil - now) / 1000)),
  };
}

/**
 * Parse an LLM response body that should contain a JSON object. Strips the
 * markdown code fences (```json ... ```) that some providers wrap around the
 * payload before attempting to parse.
 */
export function parseLlmJson<T = any>(content: string): T {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = (fenced ? fenced[1] : content).trim();
  return JSON.parse(raw) as T;
}

/**
 * Turn any thrown LLM error into a short, safe, user-facing message.
 * Never leaks raw provider JSON or key details.
 */
export function friendlyLlmError(err: unknown): string {
  if (err instanceof LlmError) {
    if (err.code === "rate_limit") {
      const mins = err.retryAfterSeconds
        ? Math.max(1, Math.ceil(err.retryAfterSeconds / 60))
        : null;
      return mins
        ? `The AI is temporarily rate-limited (daily token cap reached). Please try again in about ${mins} minute${mins === 1 ? "" : "s"}.`
        : "The AI is temporarily rate-limited (daily token cap reached). Please try again in a few minutes.";
    }
    if (err.code === "no_providers") {
      return "The AI is not configured yet. Please contact support.";
    }
  }
  return "The AI had trouble responding. Please try again in a moment.";
}

/**
 * POST to each available provider until one succeeds.
 *
 * - 429 = park the key in a cooldown and skip to the next available key.
 * - Network / other non-2xx = skip to the next key.
 * - If every key is parked or fails, throws {@link LlmError} with a code the
 *   caller can map to a friendly message via {@link friendlyLlmError}.
 */
export async function chatCompletionWithRetry(
  bodyFactory: (provider: LLMProvider) => Record<string, unknown>,
  opts?: LLMChainOptions
): Promise<{ response: Response; provider: LLMProvider }> {
  const chain = getProviderChain(opts);
  if (chain.length === 0) {
    throw new LlmError("No LLM provider configured (set GROQ_API_KEYS).", "no_providers");
  }

  const { available, soonestRetrySeconds } = availableProviders(chain);
  if (available.length === 0) {
    // Everything is cooling down from earlier 429s.
    throw new LlmError(
      `All ${chain.length} providers are rate-limited.`,
      "rate_limit",
      soonestRetrySeconds ?? undefined
    );
  }

  const maxAttempts = opts?.maxAttemptsPerProvider ?? 1;
  let lastError = "";
  let saw429 = false;
  let sawOther = false;
  let minRetrySeconds: number | null = soonestRetrySeconds;
  let triedCount = 0;

  for (const provider of available) {
    triedCount++;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`;
      if (provider.extraHeaders) Object.assign(headers, provider.extraHeaders);

      let res: Response;
      try {
        res = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyFactory(provider)),
          signal: AbortSignal.timeout(90_000),
        });
      } catch (err) {
        lastError = err instanceof Error ? err.message : "network error";
        sawOther = true;
        console.warn(`[LLM] ${provider.name} network error:`, lastError);
        break;
      }

      if (res.ok) {
        keyCooldownUntil.delete(provider.apiKey); // healthy again
        console.log(`[LLM] ${provider.name} succeeded (${triedCount}/${available.length} available keys tried)`);
        return { response: res, provider };
      }

      if (res.status === 429) {
        const body = await res.text().catch(() => "");
        const cooldown = computeCooldownSeconds(body, res.headers.get("retry-after"));
        keyCooldownUntil.set(provider.apiKey, Date.now() + cooldown * 1000);
        minRetrySeconds = minRetrySeconds == null ? cooldown : Math.min(minRetrySeconds, cooldown);
        saw429 = true;
        lastError = body.slice(0, 300);
        console.warn(`[LLM] ${provider.name} 429 — parked ${cooldown}s, trying next (${triedCount}/${available.length})`);
        break;
      }

      lastError = await res.text().catch(() => "");
      sawOther = true;
      console.warn(`[LLM] ${provider.name} error ${res.status}:`, lastError.slice(0, 300));
      break;
    }
  }

  // Only-rate-limits → actionable "try again later"; anything else → generic.
  if (saw429 && !sawOther) {
    throw new LlmError(
      `All available providers are rate-limited. Last error: ${lastError.slice(0, 200)}`,
      "rate_limit",
      minRetrySeconds ?? undefined
    );
  }

  throw new LlmError(
    `All ${chain.length} LLM providers failed. Last error: ${lastError.slice(0, 200)}`,
    "all_failed"
  );
}
