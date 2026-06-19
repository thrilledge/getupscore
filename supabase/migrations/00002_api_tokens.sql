-- Create API tokens table for extension authentication
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Chrome Extension',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);

-- Enable RLS
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own tokens
CREATE POLICY "Users can view own tokens"
  ON api_tokens FOR SELECT
  USING ((select auth.uid()) = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can create own tokens"
  ON api_tokens FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete own tokens"
  ON api_tokens FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Note: Token lookup by token string is done via admin client (service_role)
-- No RLS policy needed for that since it bypasses RLS
