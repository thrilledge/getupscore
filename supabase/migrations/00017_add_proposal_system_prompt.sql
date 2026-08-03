-- Per-user custom AI proposal system prompt (overrides the default 6-move methodology)
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS proposal_system_prompt TEXT;
