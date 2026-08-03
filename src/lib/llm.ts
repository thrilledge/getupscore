export interface LLMProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  groqStyle?: boolean;
}

export interface LLMChainOptions {
  explicitApiKey?: string;
  explicitModel?: string;
  maxAttemptsPerProvider?: number;
}

/**
 * Provider chain: DeepSeek proxy first (no rate limit pain, no key needed),
 * then Groq as fallback when a key is configured.
 */
export function getProviderChain(opts?: LLMChainOptions): LLMProvider[] {
  const chain: LLMProvider[] = [];

  chain.push({
    name: "deepshi",
    baseUrl: process.env.UPSCORE_LLM_BASE_URL || "https://deepshi-proxy.vercel.app/v1",
    apiKey: process.env.UPSCORE_LLM_API_KEY || "",
    model: process.env.UPSCORE_LLM_MODEL || "deepshi-r1",
  });

  const groqKey = opts?.explicitApiKey || process.env.GROQ_API_KEY;
  if (groqKey) {
    chain.push({
      name: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      model: opts?.explicitModel || process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      groqStyle: true,
    });
  }

  return chain;
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

      let res: Response;
      try {
        res = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyFactory(provider)),
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
