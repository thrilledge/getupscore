-- Create job_analyses table for full AI-powered job analysis
CREATE TABLE IF NOT EXISTS job_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Scores
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  opportunity_score INTEGER CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
  win_probability NUMERIC(5, 2),

  -- Rich analysis (JSON)
  skills_match JSONB DEFAULT '{}',
  budget_fit JSONB DEFAULT '{}',
  client_analysis JSONB DEFAULT '{}',
  competition_analysis JSONB DEFAULT '{}',

  -- AI output
  recommendation TEXT,
  reasoning TEXT,
  proposal_tips TEXT[] DEFAULT '{}',
  red_flags TEXT[] DEFAULT '{}',

  -- Metadata
  model_used TEXT DEFAULT 'gpt-4o-mini',
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  analysis_version INTEGER NOT NULL DEFAULT 1,

  UNIQUE(job_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_job_analyses_job_id ON job_analyses(job_id);
CREATE INDEX IF NOT EXISTS idx_job_analyses_user_id ON job_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_job_analyses_match_score ON job_analyses(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_job_analyses_analyzed_at ON job_analyses(analyzed_at DESC);

-- Enable RLS
ALTER TABLE job_analyses ENABLE ROW LEVEL SECURITY;

-- Users can read their own analyses
CREATE POLICY "Users can view own analyses"
  ON job_analyses FOR SELECT
  USING ((select auth.uid()) = user_id);

-- System (service_role) can insert/update analyses
-- (No RLS for insert/update — uses admin client)
