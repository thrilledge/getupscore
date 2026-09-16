<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UpScore App — Secrets & Tokens

> **CRITICAL:** All secrets below are in `.env.local` (gitignored) and Vercel env vars.
> Never hardcode these in scripts. Use environment variables.

## Supabase
- **Project ref:** `kjfqtenfmxdoyjxxnhnm`
- **URL:** `https://kjfqtenfmxdoyjxxnhnm.supabase.co`
- **Anon key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZnF0ZW5mbXhkb3lqeHhuaG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1OTY0NzEsImV4cCI6MjA5NzE3MjQ3MX0.UYUDEQ_FACTDWeB7Fr3TzVxnnD9Rvkrh9Wr95al24BA`
- **Service role key:** `sb_secret_dI5gwLE0HaNKXRXWQlgcJg_IRwEZmKU` (use via env var `SUPABASE_SERVICE_ROLE_KEY`, NEVER hardcode)
- **Supabase CLI token:** `sbp_0e7eaf45e642eb9788b0023eacb97b91ab6c1070`

## Vercel
- **Team:** `team_hnK4nKqwTWyvOuQWidykA5nC`
- **Project:** `prj_RNGyqa8sJsqVMIufzVcCcAbPoIyM`
- **Vercel token:** `vcp_3mmQyZ6eee2hTEwZFdYUgNYLrBZk4ZcbU4rkyLFceA92bIn2bB3Bp5HF`
- **Deploy command:** `npx vercel --token "vcp_3mmQyZ6eee2hTEwZFdYUgNYLrBZk4ZcbU4rkyLFceA92bIn2bB3Bp5HF" --prod --yes`
- **Production URL:** `https://www.getupscore.com`

## AI / LLM
- **Groq API key:** `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` (env: `GROQ_API_KEY`)
- **Primary model:** `openai/gpt-oss-20b` via Groq
- **DeepSeek proxy:** `https://deepshi-proxy.vercel.app/v1` (env: `UPSCORE_LLM_BASE_URL`, model: `deepshi-r1`)

## Inngest
- **App ID:** `upscore`
- **Signing key:** `signkey-prod-e39aacb8f9dd9cad82c8915740fc7983a72f79296d7ebe7a92ff263c780c662b` (env: `INNGEST_SIGNING_KEY`)
- **Event key:** `7HBr0PoztBYdvPM8amMDonNTf2pQ3yhmDmKiv73mcmQyCvc8QhY2uUnCT4OXaitwbCaZYUqd42y9mRjYESbc1A` (env: `INNGEST_EVENT_KEY`)
- **Serve endpoint:** `https://www.getupscore.com/api/inngest`

## Upstash Redis
- **URL:** `https://optimum-raven-68827.upstash.io`
- **Token:** `gQAAAAAAAQzbAAIgcDJkNzRhMzQwYzBhNDk0NWIwYTljNGNmZWI3ZWQyYWU3NA` (env: `UPSTASH_REDIS_REST_TOKEN`)

## Cron
- **CRON_SECRET:** `0b34f5d0f122f313ad8668ddad9ebe8f` (used for `/api/jobs/cron`, `/api/jobs/vibeworker`, `/api/cron/cleanup`)
- **Vercel cron:** Every 5 min hits `/api/jobs/cron`

## SMTP (Email)
- **Host:** `smtp.hostinger.com:465`
- **Email:** `hello@getupscore.com`
- **Password:** `Helloworld!6381` (env: `SMTP_PASSWORD`)

## Slack
- **Client ID:** `9064428320039.11660610499267`
- **Client secret:** `78efbee427ec80da719a74172ef2a932` (env: `SLACK_CLIENT_SECRET`)
- **Signing secret:** `97af8ef88ea233ad2651b32902d0ab43` (env: `SLACK_SIGNING_SECRET`)

---

# VPS Deployment (Contabo)

- **Host:** 144.91.85.40
- **User:** root (password auth; key `C:\Users\Usama\.ssh\contabo_vps` also generated) password: Pu9Ia6AKwRNc2
- **OS:** Ubuntu 24.04.4 LTS, Node v22, Python 3.12
- **Scripts path:** `/root/mcp-client/`
- **Env file:** `/etc/upwork-mcp.env` (SUPABASE_URL + SUPABASE_SERVICE_KEY)
- **Log:** `/var/log/upwork-mcp-sync.log`

### Active services
- **`upwork-mcp-sync.service`** + **`upwork-mcp-sync.timer`** — MCP job sync (every 5 min)
- **Run now:** `systemctl start upwork-mcp-sync.service`
- **Check:** `systemctl list-timers | grep upwork`, `tail -30 /var/log/upwork-mcp-sync.log`

### EC2 (OLD, DOWN)

- **Host:** 13.48.204.110 — was `upwork-api` on port 8000 → nginx; VW ingest. Instance stopped/expired.
- `oauth.getupscore.com` (nginx + certbot SSL → `localhost:8123`) also on EC2 — now unreachable.
- ~~`vw-ingest.service`~~ / ~~`upwork-ingest.service`~~ — dead with EC2; DO NOT re-enable / recreate.

---

# Architecture — How Jobs Flow

> **IMPORTANT:** Jobs now sync via the **Upwork MCP API** (`mcp_client.js`) on the Contabo VPS — NOT TryVibeWorker.
> The old EC2/VW pipeline (`vw_ingest.py`) and custom Upwork scraper (`ingest_uphunt.py`) are DEAD — do NOT use.

## Job Fetching Pipeline (VPS)

```
Contabo VPS (every 5 min via upwork-mcp-sync.timer)
    ↓
/root/mcp-client/run_sync.sh (sources /etc/upwork-mcp.env)
    ↓
node mcp_client.js sync → tools/call upwork__find_jobs action=search (limit 10, recency)
    ↓
per-job tools/call action=get → full details (proposals, client spend, verified payment, duration)
    ↓
mcp_get_jobs.json → python3 save_get_jobs_to_db.py --update
    ↓
jobs table upsert (dedupe by upwork_job_id) — Vercel reads same Supabase DB
```

## Key Design Decisions
1. **Contabo VPS does ALL heavy lifting** — MCP fetch, per-job details, static scoring is on app side. Vercel just reads the same Supabase DB.
2. **Static pre-filter** (`static-score.ts`) — rule-based 0-100 scoring, threshold ≥30. Saves 60-80% AI calls.
3. **AI analysis is fire-and-forget** — response returns immediately, analysis runs in background.
4. **Upwork MCP provides rich client data** — proposals count, client spend, hire rate, verified payment, duration, preferred qualifications.
5. **Inngest** handles `process-cron-jobs` and `process-extension-sync` — NOT used for MCP ingest (sync runs entirely on VPS).

---

# Inngest Functions

| Function | Trigger | Purpose |
|---|---|---|
| `process-cron-jobs` | `app/cron.trigger` | Fetches jobs (old flow), static pre-filters, sends analysis events |
| `analyze-job` | `app/jobs.analyze` | AI-analyzes a single job for a single user |
| `process-extension-sync` | `app/extension.sync` | Handles extension-synced jobs |

**Note:** MCP ingest does NOT use Inngest. It calls `analyzeJob()` directly (fire-and-forget) from the Vercel app.

---

# Database Migrations

- **Location:** `supabase/migrations/`
- **Apply:** `npx supabase db push --linked`
- **Last migration:** `00026_add_client_hire_rate_to_search_jobs.sql`

---

# Security Audit (2026-08-18)

## FIXED
1. ✅ Wildcard CORS on auth endpoints → restricted to chrome-extension:// / moz-extension://
2. ✅ Plaintext Upwork cookies → dropped `upwork_sessions` table, deleted cookie sync route
3. ✅ Timing attack on CRON_SECRET → `timingSafeEqual` on all 5 endpoints
4. ✅ Hardcoded secrets in scripts → replaced with `os.environ.get()` across 25+ files
5. ✅ No rate limiting → `@upstash/ratelimit` on auth (10/min), analysis (20/min), proposals (10/min)
6. ✅ IDOR on job endpoints → `job_analyses` join filtered by `user_id` via `!inner` + `.eq("user_id")`
7. ✅ `search_jobs` leaks other users' analyses/scores → new `p_user_id` param filters per user
8. ✅ No CSP/security headers → `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, CSP, etc.
9. ✅ Error messages leak internals → generic "Internal server error" / "Failed to fetch jobs"
10. ✅ Weak password minimum → 8 chars (JS validation + HTML)
11. ✅ `/api/jobs/full-details` open → requires auth
12. ✅ `/api/jobs/status` open → requires auth

## Remaining (Git History)
- **Secrets in git history** — Even though removed from code, they remain in commit history.
  Recommend: rotate ALL secrets (Supabase service role, Groq API key, SMTP password, VW creds, etc.)
- **Prompt injection** on chat and proposal generation — needs input sanitization.
