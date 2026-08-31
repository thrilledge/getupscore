-- Per-user proposal submission mode:
--   'draft'      = AI writes the proposal and saves it to the Proposals page (no
--                  Upwork action, no Connects spend). Default.
--   'publish'    = AI writes the proposal and prepares the real Upwork submission
--                  for the user to review/confirm (spends Connects).
--   'auto_submit'= AI writes the proposal and submits it directly to Upwork
--                  (spends Connects).
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS proposal_submit_mode TEXT NOT NULL DEFAULT 'draft';
