import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface LlmUsageLog {
  user_id?: string;
  provider: string;
  model: string;
  endpoint: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  duration_ms?: number;
  success: boolean;
  error_message?: string;
}

/**
 * Fire-and-forget LLM usage logger. Writes to `llm_usage_logs` table.
 * Never throws — logging failures are silently swallowed.
 */
export async function logLlmUsage(log: LlmUsageLog): Promise<void> {
  try {
    const admin = createSupabaseAdminClient() as any;
    await admin.from("llm_usage_logs").insert({
      user_id: log.user_id || null,
      provider: log.provider,
      model: log.model,
      endpoint: log.endpoint,
      prompt_tokens: log.prompt_tokens,
      completion_tokens: log.completion_tokens,
      total_tokens: log.total_tokens,
      duration_ms: log.duration_ms || null,
      success: log.success,
      error_message: log.error_message || null,
    });
  } catch {
    // Silent — logging must never break the main flow
  }
}
