export interface LLMProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  groqStyle?: boolean;
  extraHeaders?: Record<string, string>;
}

export type ProviderName = "gemini" | "groq" | "deepshi";

export interface LLMChainOptions {
  /** Force a specific provider, skipping the default chain order. */
  provider?: ProviderName;
  maxAttemptsPerProvider?: number;
}

/**
 * Provider chain: Gemini first (best value for paid), Groq (free tier),
 * Deepshi as last-resort fallback.
 * Pass `provider: "groq"` to skip Gemini (used for free-tier proposals).
 */
export function getProviderChain(opts?: LLMChainOptions): LLMProvider[] {
  const all = buildAllProviders();

  if (opts?.provider) {
    const match = all.find((p) => p.name === opts.provider);
    return match ? [match] : [];
  }

  return all;
}

function buildAllProviders(): LLMProvider[] {
  const chain: LLMProvider[] = [];

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    chain.push({
      name: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    chain.push({
      name: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      groqStyle: true,
    });
  }

  const deepshiHeaders: Record<string, string> = {};
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypassSecret) deepshiHeaders["x-vercel-protection-bypass"] = bypassSecret;

  chain.push({
    name: "deepshi",
    baseUrl: process.env.UPSCORE_LLM_BASE_URL || "https://deepshi-proxy.vercel.app/v1",
    apiKey: process.env.UPSCORE_LLM_API_KEY || "",
    model: process.env.UPSCORE_LLM_MODEL || "deepshi-r1",
    extraHeaders: Object.keys(deepshiHeaders).length > 0 ? deepshiHeaders : undefined,
  });

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
 * POST to each provider in the chain until one succeeds. Retries 429s with
 * exponential backoff (honoring Retry-After). Returns the first ok response
 * with its provider; throws when every provider has failed.
 */
export async function chatCompletionWithRetry(
  bodyFactory: (provider: LLMProvider) => Record<string, unknown>,
  opts?: LLMChainOptions
): Promise<{ response: Response; provider: LLMProvider }> {
  const chain = getProviderChain(opts);
  const maxAttempts = opts?.maxAttemptsPerProvider ?? 2;
  let lastError = "";

  for (const provider of chain) {
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
          signal: AbortSignal.timeout(45_000),
        });
      } catch (err) {
        lastError = err instanceof Error ? err.message : "network error";
        console.warn(`[LLM] ${provider.name} network error:`, lastError);
        break;
      }

      if (res.status !== 429 || attempt === maxAttempts - 1) {
        if (res.ok) return { response: res, provider };
        lastError = await res.text().catch(() => "");
        console.warn(`[LLM] ${provider.name} error ${res.status}:`, lastError.slice(0, 300));
        break;
      }

      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1200 * (attempt + 1);
      console.warn(`[LLM] ${provider.name} rate limited, retrying in ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 8000)));
    }
  }

  throw new Error(`All LLM providers failed. Last error: ${lastError.slice(0, 300)}`);
}
