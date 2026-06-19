-- Create upwork_sessions table for storing browser session cookies
-- These cookies allow the server-side cron to authenticate with Upwork's GraphQL
-- via ScrapingAnt proxy. Cookies are captured by the extension's content script
-- from the page context (main world) where Cloudflare clearance exists.
CREATE TABLE IF NOT EXISTS upwork_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The full cookie string from document.cookie
  cookie_string TEXT NOT NULL,

  -- Metadata about when/how cookies were captured
  domain TEXT NOT NULL DEFAULT 'www.upwork.com',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Auto-track when this row was last updated
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_upwork_sessions_user_id ON upwork_sessions(user_id);

-- Enable RLS
ALTER TABLE upwork_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own session
CREATE POLICY "Users can view own session"
  ON upwork_sessions FOR SELECT
  USING ((select auth.uid()) = user_id);

-- Users can insert their own session
CREATE POLICY "Users can manage own session"
  ON upwork_sessions FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- Users can update their own session
CREATE POLICY "Users can update own session"
  ON upwork_sessions FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_upwork_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_upwork_sessions_updated_at
  BEFORE UPDATE ON upwork_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_upwork_sessions_updated_at();
