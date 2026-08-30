-- Per-user Upwork OAuth connections for the app-side (Vercel) client.
-- Each signed-in user connects their OWN Upwork account so the app can
-- read their connects balance and (later) submit proposals on their behalf
-- via the Upwork MCP (`manage_proposals`).
--
-- Tokens are stored ENCRYPTED (AES-256-GCM) using an app-side key held in
-- UPWORK_TOKEN_ENCRYPTION_KEY (never the raw token in the DB).

CREATE TABLE IF NOT EXISTS public.upwork_connections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  upwork_user_uid   text NOT NULL,
  org_uid           text NOT NULL,
  display_name      text,

  -- Encrypted OAuth payload (JSON {"access_token","refresh_token","expires_at","token_type","scope"}).
  token_enc         text NOT NULL,
  token_iv          text NOT NULL,
  token_tag         text NOT NULL,

  -- Encryption key reference / rotation version (default 1).
  key_version       integer NOT NULL DEFAULT 1,

  -- Upwork registry (dynamic client) being used, for future rotation.
  client_ref        text,

  last_synced_at    timestamptz,
  is_active         boolean NOT NULL DEFAULT true,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS upwork_connections_user_idx
  ON public.upwork_connections (user_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS upwork_connections_org_idx
  ON public.upwork_connections (org_uid);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_upwork_connections_updated_at ON public.upwork_connections;
CREATE TRIGGER trg_upwork_connections_updated_at
  BEFORE UPDATE ON public.upwork_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: only the owning user can read/write their own connection row.
ALTER TABLE public.upwork_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upwork_connections_select_own ON public.upwork_connections;
CREATE POLICY upwork_connections_select_own
  ON public.upwork_connections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert is allowed for the owning user (the server writes, but keep it safe).
DROP POLICY IF EXISTS upwork_connections_insert_own ON public.upwork_connections;
CREATE POLICY upwork_connections_insert_own
  ON public.upwork_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS upwork_connections_update_own ON public.upwork_connections;
CREATE POLICY upwork_connections_update_own
  ON public.upwork_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS upwork_connections_delete_own ON public.upwork_connections;
CREATE POLICY upwork_connections_delete_own
  ON public.upwork_connections
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.upwork_connections
  IS 'Per-user Upwork OAuth connections (encrypted tokens) for app-side MCP access.';
