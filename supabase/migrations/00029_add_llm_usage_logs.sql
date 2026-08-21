-- Track LLM API usage: tokens, cost, per-user breakdown
CREATE TABLE IF NOT EXISTS public.llm_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,           -- 'groq-1', 'groq-2', etc.
  model TEXT NOT NULL,              -- 'openai/gpt-oss-20b'
  endpoint TEXT NOT NULL,           -- 'proposal', 'analysis', 'chat', 'answer'
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,              -- request duration in milliseconds
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: only service_role can access (admin-only data)
ALTER TABLE public.llm_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on llm_usage_logs"
  ON public.llm_usage_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX idx_llm_usage_logs_created_at ON public.llm_usage_logs (created_at DESC);
CREATE INDEX idx_llm_usage_logs_user_id ON public.llm_usage_logs (user_id);
CREATE INDEX idx_llm_usage_logs_provider ON public.llm_usage_logs (provider);
CREATE INDEX idx_llm_usage_logs_endpoint ON public.llm_usage_logs (endpoint);

-- RPC: Get LLM usage stats for admin dashboard
CREATE OR REPLACE FUNCTION public.get_llm_usage_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_one_day_ago TIMESTAMPTZ := now() - INTERVAL '24 hours';
  v_seven_days_ago TIMESTAMPTZ := now() - INTERVAL '7 days';
  v_thirty_days_ago TIMESTAMPTZ := now() - INTERVAL '30 days';
  v_result JSON;
BEGIN
  SELECT json_build_object(
    -- Totals
    'total_calls', (SELECT count(*) FROM llm_usage_logs),
    'total_tokens_all_time', (SELECT COALESCE(sum(total_tokens), 0) FROM llm_usage_logs),
    'total_prompt_tokens', (SELECT COALESCE(sum(prompt_tokens), 0) FROM llm_usage_logs),
    'total_completion_tokens', (SELECT COALESCE(sum(completion_tokens), 0) FROM llm_usage_logs),

    -- 24h stats
    'calls_24h', (SELECT count(*) FROM llm_usage_logs WHERE created_at >= v_one_day_ago),
    'tokens_24h', (SELECT COALESCE(sum(total_tokens), 0) FROM llm_usage_logs WHERE created_at >= v_one_day_ago),

    -- 7d stats
    'calls_7d', (SELECT count(*) FROM llm_usage_logs WHERE created_at >= v_seven_days_ago),
    'tokens_7d', (SELECT COALESCE(sum(total_tokens), 0) FROM llm_usage_logs WHERE created_at >= v_seven_days_ago),

    -- 30d stats
    'calls_30d', (SELECT count(*) FROM llm_usage_logs WHERE created_at >= v_thirty_days_ago),
    'tokens_30d', (SELECT COALESCE(sum(total_tokens), 0) FROM llm_usage_logs WHERE created_at >= v_thirty_days_ago),

    -- Per-provider breakdown (24h)
    'by_provider_24h', (
      SELECT json_agg(json_build_object(
        'provider', provider,
        'calls', calls,
        'tokens', tokens
      ))
      FROM (
        SELECT provider, count(*) as calls, sum(total_tokens) as tokens
        FROM llm_usage_logs
        WHERE created_at >= v_one_day_ago
        GROUP BY provider
        ORDER BY tokens DESC
      ) sub
    ),

    -- Per-endpoint breakdown (24h)
    'by_endpoint_24h', (
      SELECT json_agg(json_build_object(
        'endpoint', endpoint,
        'calls', calls,
        'tokens', tokens
      ))
      FROM (
        SELECT endpoint, count(*) as calls, sum(total_tokens) as tokens
        FROM llm_usage_logs
        WHERE created_at >= v_one_day_ago
        GROUP BY endpoint
        ORDER BY tokens DESC
      ) sub
    ),

    -- Top users by token usage (7d)
    'top_users_7d', (
      SELECT json_agg(json_build_object(
        'user_id', user_id,
        'calls', calls,
        'tokens', tokens
      ))
      FROM (
        SELECT user_id, count(*) as calls, sum(total_tokens) as tokens
        FROM llm_usage_logs
        WHERE created_at >= v_seven_days_ago AND user_id IS NOT NULL
        GROUP BY user_id
        ORDER BY tokens DESC
        LIMIT 20
      ) sub
    ),

    -- Daily tokens (last 7 days)
    'daily_tokens_7d', (
      SELECT json_agg(json_build_object(
        'date', day,
        'tokens', COALESCE(tokens, 0),
        'calls', COALESCE(calls, 0)
      ))
      FROM (
        SELECT d::date as day
        FROM generate_series(now() - INTERVAL '6 days', now(), INTERVAL '1 day') d
      ) days
      LEFT JOIN (
        SELECT date_trunc('day', created_at)::date as day,
               sum(total_tokens) as tokens,
               count(*) as calls
        FROM llm_usage_logs
        WHERE created_at >= v_seven_days_ago
        GROUP BY date_trunc('day', created_at)::date
      ) usage ON usage.day = days.day
      ORDER BY days.day
    ),

    -- Error rate (24h)
    'errors_24h', (SELECT count(*) FROM llm_usage_logs WHERE created_at >= v_one_day_ago AND success = false),
    'success_rate_24h', (
      CASE
        WHEN (SELECT count(*) FROM llm_usage_logs WHERE created_at >= v_one_day_ago) = 0 THEN 100
        ELSE round(
          (SELECT count(*) FROM llm_usage_logs WHERE created_at >= v_one_day_ago AND success = true)::numeric /
          (SELECT count(*) FROM llm_usage_logs WHERE created_at >= v_one_day_ago)::numeric * 100,
          1
        )
      END
    ),

    -- Key health (429 count per provider, 24h)
    'rate_limits_24h', (
      SELECT json_agg(json_build_object(
        'provider', provider,
        'count', cnt
      ))
      FROM (
        SELECT provider, count(*) as cnt
        FROM llm_usage_logs
        WHERE created_at >= v_one_day_ago AND success = false AND error_message ILIKE '%429%'
        GROUP BY provider
      ) sub
    )
  ) INTO v_result;

  RETURN v_result;
END $$;

-- Grant access to service_role only
REVOKE ALL ON FUNCTION public.get_llm_usage_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_llm_usage_stats() TO service_role;
