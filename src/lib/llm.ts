export interface LLMProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  groqStyle?: boolean;
  extraHeaders?: Record<string, string>;
}

export type ProviderName = "groq";

export interface LLMChainOptions {
  /** Force a specific provider, skipping the default chain order. */
  provider?: ProviderName;
  maxAttemptsPerProvider?: number;
}

/**
 * Provider chain: Multiple Groq API keys for high availability.
 * Each key has its own daily quota. On 429, automatically skips to next key.
 *
 * Supports:
 * - GROQ_API_KEYS: comma-separated list of API keys (preferred)
 * - GROQ_API_KEY: single API key (backward compatible)
 */
export function getProviderChain(opts?: LLMChainOptions): LLMProvider[] {
  return buildAllProviders();
}

function buildAllProviders(): LLMProvider[] {
  const chain: LLMProvider[] = [];
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
    console.log(`[LLM] Loaded ${chain.length} Groq API keys from GROQ_API_KEYS`);
    return chain;
  }

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
    console.log("[LLM] Loaded single Groq API key from GROQ_API_KEY");
  }

  return chain;
}

/**
 * Parse an LLM response body that should contain a JSON object. Strips the
 * markdown code fences (```json ... ```) that some providers (e.g. deepshi)
 * wrap around the payload before attempting to parse.
 */
export function parseLlmJson<T = any>(content: string): T {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = (fenced ? fenced[1] : content).trim();
  return JSON.parse(raw) as T;
}

/**
 * POST to each provider in the chain until one succeeds.
 *
 * - 429 = skip immediately to next provider (no retry — limits don't recover mid-request)
 * - Network error = skip to next provider
 * - Other non-2xx = skip to next provider
 *
 * With 10 Groq keys, each key is tried once. If key 1 is rate-limited,
 * key 2 is tried immediately, and so on.
 */
export async function chatCompletionWithRetry(
  bodyFactory: (provider: LLMProvider) => Record<string, unknown>,
  opts?: LLMChainOptions
): Promise<{ response: Response; provider: LLMProvider }> {
  const chain = getProviderChain(opts);
  // With multiple keys, try each key once (no retry per key)
  const maxAttempts = opts?.maxAttemptsPerProvider ?? 1;
  let lastError = "";
  let triedCount = 0;

  for (const provider of chain) {
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
        console.warn(`[LLM] ${provider.name} network error:`, lastError);
        break;
      }

      if (res.ok) {
        console.log(`[LLM] ${provider.name} succeeded (${triedCount}/${chain.length} keys tried)`);
        return { response: res, provider };
      }

      if (res.status === 429) {
        const body = await res.text().catch(() => "");
        // Any 429 = skip to next key. Daily limits aren't recovering mid-request.
        console.warn(`[LLM] ${provider.name} 429 — skipping to next key (${triedCount}/${chain.length})`);
        lastError = body.slice(0, 300);
        break;
      }

      lastError = await res.text().catch(() => "");
      console.warn(`[LLM] ${provider.name} error ${res.status}:`, lastError.slice(0, 300));
      break;
    }
  }

  throw new Error(`All ${chain.length} LLM providers failed. Last error: ${lastError.slice(0, 300)}`);
}
