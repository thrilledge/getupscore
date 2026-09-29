-- 00049: Upwork MCP config — jobs-per-sync + interval + last sync report
-- Read by the VPS sync (mcp_config.py) and edited from /admin/upwork-token.
CREATE TABLE IF NOT EXISTS public.upwork_mcp_config (
  id integer PRIMARY KEY DEFAULT 1,
  jobs_per_sync integer NOT NULL DEFAULT 10,
  sync_interval_minutes integer NOT NULL DEFAULT 5,
  last_sync_at timestamptz,
  last_sync_jobs integer,
  updated_at timestamptz DEFAULT now() NOT NULL
);
INSERT INTO public.upwork_mcp_config (id, jobs_per_sync, sync_interval_minutes)
VALUES (1, 10, 5)
ON CONFLICT (id) DO NOTHING;