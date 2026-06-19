-- ──────────────────────────────────────────────────────────
-- UpScore — Initial Database Schema
-- Run this in the Supabase SQL Editor or via:
--   supabase db push
-- ──────────────────────────────────────────────────────────

-- 0. Enums
-- ────────────────────────

CREATE TYPE channel_type AS ENUM (
  'email',
  'telegram',
  'slack',
  'discord',
  'webhook',
  'sms'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'failed'
);

CREATE TYPE proposal_status AS ENUM (
  'draft',
  'sent',
  'won',
  'lost'
);

-- 1. Job Filters
-- ────────────────────────
-- Users save custom search filters to monitor relevant jobs.

CREATE TABLE job_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Filter',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  min_budget NUMERIC(10, 2),
  max_budget NUMERIC(10, 2),
  client_countries TEXT[] NOT NULL DEFAULT '{}',
  min_client_spend NUMERIC(10, 2),
  max_proposals INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_filters_user_id ON job_filters(user_id);
CREATE INDEX idx_job_filters_is_active ON job_filters(is_active);

-- 2. Jobs
-- ────────────────────────
-- Unique jobs fetched from Upwork.

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upwork_job_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  budget NUMERIC(10, 2),
  hourly_min NUMERIC(10, 2),
  hourly_max NUMERIC(10, 2),
  client_country TEXT,
  client_spend NUMERIC(10, 2),
  client_hire_rate NUMERIC(5, 2),
  proposals_count INTEGER,
  url TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_upwork_job_id ON jobs(upwork_job_id);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX idx_jobs_proposals_count ON jobs(proposals_count);

-- 3. Job Scores
-- ────────────────────────
-- Per-user job scoring for match + opportunity.

CREATE TABLE job_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_score INTEGER,
  opportunity_score INTEGER,
  win_probability NUMERIC(5, 2),
  recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, user_id)
);

CREATE INDEX idx_job_scores_user_id ON job_scores(user_id);
CREATE INDEX idx_job_scores_match_score ON job_scores(match_score DESC);

-- 4. Notification Channels (Dynamic — user-created)
-- ────────────────────────
-- Users can create any channel type from the frontend.
-- Each channel stores type-specific config as JSONB.

CREATE TABLE notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type channel_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_channels_user_id ON notification_channels(user_id);
CREATE INDEX idx_notification_channels_type ON notification_channels(type);

-- 5. Notification Rules
-- ────────────────────────
-- Each channel has rules for which jobs trigger alerts.

CREATE TABLE notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
  job_filter_id UUID REFERENCES job_filters(id) ON DELETE SET NULL,
  match_score_min INTEGER NOT NULL DEFAULT 75,
  opportunity_score_min INTEGER NOT NULL DEFAULT 70,
  max_proposals INTEGER NOT NULL DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_rules_user_id ON notification_rules(user_id);
CREATE INDEX idx_notification_rules_channel_id ON notification_rules(channel_id);

-- 6. Notifications (sent alerts)
-- ────────────────────────

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- 7. Proposals
-- ────────────────────────
-- AI-generated proposals with review scores.

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  generated_text TEXT NOT NULL,
  final_text TEXT,
  score INTEGER,
  status proposal_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposals_user_id ON proposals(user_id);
CREATE INDEX idx_proposals_job_id ON proposals(job_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);

-- ──────────────────────────────────────────────────────────
-- RLS (Row Level Security) Policies
-- ──────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE job_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Job Filters: users can CRUD their own filters
CREATE POLICY "users can select own filters"
  ON job_filters FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "users can insert own filters"
  ON job_filters FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users can update own filters"
  ON job_filters FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users can delete own filters"
  ON job_filters FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Jobs: readable by all authenticated users (they are public Upwork data)
CREATE POLICY "authenticated users can read jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

-- Only the system (service_role) can insert/update jobs
-- (No RLS policy for insert/update — service_role bypasses RLS)

-- Job Scores: users can see their own scores
CREATE POLICY "users can select own scores"
  ON job_scores FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Notification Channels: users can CRUD their own channels
CREATE POLICY "users can select own channels"
  ON notification_channels FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "users can insert own channels"
  ON notification_channels FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users can update own channels"
  ON notification_channels FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users can delete own channels"
  ON notification_channels FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Notification Rules: users can CRUD their own rules
CREATE POLICY "users can select own rules"
  ON notification_rules FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "users can insert own rules"
  ON notification_rules FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users can update own rules"
  ON notification_rules FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users can delete own rules"
  ON notification_rules FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Notifications: users can see their own notifications
CREATE POLICY "users can select own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Proposals: users can CRUD their own proposals
CREATE POLICY "users can select own proposals"
  ON proposals FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "users can insert own proposals"
  ON proposals FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users can update own proposals"
  ON proposals FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users can delete own proposals"
  ON proposals FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ──────────────────────────────────────────────────────────
-- Helper: updated_at trigger function
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_job_filters_updated_at
  BEFORE UPDATE ON job_filters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_channels_updated_at
  BEFORE UPDATE ON notification_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON notification_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
