-- ============================================================
-- 00030: Advanced Admin Panel tables
-- ============================================================

-- 1. User activity logs (track every meaningful action)
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,        -- 'login', 'proposal_generated', 'analysis_run', 'chat_used', 'filter_created', 'job_saved', 'subscription_changed'
  metadata JSONB DEFAULT '{}', -- extra context: { job_id, proposal_score, endpoint, etc. }
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON public.user_activity_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_activity_user_id ON public.user_activity_logs (user_id);
CREATE INDEX idx_activity_action ON public.user_activity_logs (action);
CREATE INDEX idx_activity_created ON public.user_activity_logs (created_at DESC);

-- 2. Error logs
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,         -- 'llm', 'api', 'webhook', 'extension', 'cron'
  severity TEXT NOT NULL DEFAULT 'error', -- 'warn', 'error', 'critical'
  message TEXT NOT NULL,
  stack TEXT,
  metadata JSONB DEFAULT '{}', -- { user_id, provider, endpoint, status_code, etc. }
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON public.error_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_error_source ON public.error_logs (source);
CREATE INDEX idx_error_severity ON public.error_logs (severity);
CREATE INDEX idx_error_created ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_resolved ON public.error_logs (resolved);

-- 3. A/B Tests
CREATE TABLE IF NOT EXISTS public.ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'running', 'paused', 'completed'
  variants JSONB NOT NULL DEFAULT '[]', -- [{ name: "control", weight: 50 }, { name: "variant_a", weight: 50 }]
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ab_test_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_id, user_id)
);

ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON public.ab_tests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access" ON public.ab_test_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. User feedback
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'general', -- 'bug', 'feature', 'general', 'proposal_quality'
  rating INTEGER, -- 1-5 stars
  message TEXT NOT NULL,
  page_url TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'reviewed', 'actioned', 'dismissed'
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON public.user_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "User can insert own feedback" ON public.user_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_feedback_status ON public.user_feedback (status);
CREATE INDEX idx_feedback_category ON public.user_feedback (category);
CREATE INDEX idx_feedback_created ON public.user_feedback (created_at DESC);

-- 5. Bulk email campaigns
CREATE TABLE IF NOT EXISTS public.bulk_email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  target_segment TEXT NOT NULL, -- 'all', 'free', 'pro', 'churned', 'active', 'inactive_7d', 'inactive_30d'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sending', 'sent', 'failed'
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

ALTER TABLE public.bulk_email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON public.bulk_email_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. User segments (precomputed)
CREATE TABLE IF NOT EXISTS public.user_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  segment TEXT NOT NULL DEFAULT 'new', -- 'power', 'active', 'casual', 'at_risk', 'churned', 'new'
  score INTEGER DEFAULT 0, -- engagement score 0-100
  last_active_at TIMESTAMPTZ,
  total_proposals INTEGER DEFAULT 0,
  total_analyses INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON public.user_segments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_segment_segment ON public.user_segments (segment);
CREATE INDEX idx_segment_score ON public.user_segments (score DESC);

-- RPC: Refresh all user segments (call periodically)
CREATE OR REPLACE FUNCTION public.refresh_user_segments()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSON;
  v_updated INTEGER := 0;
BEGIN
  -- Upsert segments based on activity
  INSERT INTO user_segments (user_id, segment, score, last_active_at, total_proposals, total_analyses, updated_at)
  SELECT
    u.id AS user_id,
    CASE
      WHEN COALESCE(act.proposal_count, 0) >= 20 AND COALESCE(act.analysis_count, 0) >= 30 THEN 'power'
      WHEN COALESCE(act.proposal_count, 0) >= 5 OR COALESCE(act.analysis_count, 0) >= 10 THEN 'active'
      WHEN COALESCE(act.proposal_count, 0) >= 1 OR COALESCE(act.analysis_count, 0) >= 1 THEN 'casual'
      WHEN u.last_sign_in_at < now() - INTERVAL '30 days' THEN 'churned'
      WHEN u.last_sign_in_at < now() - INTERVAL '7 days' THEN 'at_risk'
      ELSE 'new'
    END AS segment,
    LEAST(100, GREATEST(0,
      COALESCE(act.proposal_count, 0) * 3 +
      COALESCE(act.analysis_count, 0) * 2 +
      COALESCE(act.saved_count, 0) * 1 +
      CASE WHEN sub.status = 'active' THEN 20 ELSE 0 END
    )) AS score,
    GREATEST(u.last_sign_in_at, act.last_activity) AS last_active_at,
    COALESCE(act.proposal_count, 0) AS total_proposals,
    COALESCE(act.analysis_count, 0) AS total_analyses,
    now() AS updated_at
  FROM auth.users u
  LEFT JOIN LATERAL (
    SELECT
      (SELECT count(*) FROM proposals WHERE user_id = u.id) AS proposal_count,
      (SELECT count(*) FROM job_analyses WHERE user_id = u.id) AS analysis_count,
      (SELECT count(*) FROM saved_jobs WHERE user_id = u.id) AS saved_count,
      GREATEST(
        (SELECT max(created_at) FROM proposals WHERE user_id = u.id),
        (SELECT max(created_at) FROM job_analyses WHERE user_id = u.id)
      ) AS last_activity
  ) act ON true
  LEFT JOIN LATERAL (
    SELECT status FROM subscriptions WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
  ) sub ON true
  ON CONFLICT (user_id) DO UPDATE SET
    segment = EXCLUDED.segment,
    score = EXCLUDED.score,
    last_active_at = EXCLUDED.last_active_at,
    total_proposals = EXCLUDED.total_proposals,
    total_analyses = EXCLUDED.total_analyses,
    updated_at = now();

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN json_build_object('ok', true, 'updated', v_updated);
END $$;

REVOKE ALL ON FUNCTION public.refresh_user_segments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_user_segments() TO service_role;

-- RPC: Get conversion funnel data
CREATE OR REPLACE FUNCTION public.get_conversion_funnel()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'signed_up', (SELECT count(*) FROM auth.users),
    'have_profile', (SELECT count(*) FROM upwork_profiles),
    'ran_analysis', (SELECT count(DISTINCT user_id) FROM job_analyses),
    'generated_proposal', (SELECT count(DISTINCT user_id) FROM proposals),
    'created_filter', (SELECT count(DISTINCT user_id) FROM job_filters),
    'is_pro', (SELECT count(DISTINCT user_id) FROM subscriptions WHERE status = 'active'),
    'was_pro', (SELECT count(DISTINCT user_id) FROM subscriptions WHERE status = 'canceled'),
    'last_7d_active', (SELECT count(DISTINCT user_id) FROM llm_usage_logs WHERE created_at >= now() - INTERVAL '7 days'),
    'last_30d_active', (SELECT count(DISTINCT user_id) FROM llm_usage_logs WHERE created_at >= now() - INTERVAL '30 days')
  ) INTO v_result;

  RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.get_conversion_funnel() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conversion_funnel() TO service_role;
