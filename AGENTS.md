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

# EC2 Deployment

- **Host:** 13.48.204.110
- **User:** ubuntu
- **PEM key:** `C:\Users\Usama\Downloads\mylogikeypair.pem`
- **SSH command:** `ssh -i C:\Users\Usama\Downloads\mylogikeypair.pem ubuntu@13.48.204.110`
- **SCP copy:** `scp -i C:\Users\Usama\Downloads\mylogikeypair.pem <local_file> ubuntu@13.48.204.110:<remote_path>`
- **Docker container:** `upwork-api` on port 8000 → nginx on port 80
- **Scripts path on EC2:** `/home/ubuntu/upwork-api/`

### Active services (ONLY this runs)
- **`vw-ingest.service`** + **`vw-ingest.timer`** — TryVibeWorker fetcher (every 5 min)
- **Restart:** `sudo systemctl restart upwork-ingest.timer && sudo systemctl start upwork-ingest.service`

### Disabled services (DO NOT re-enable)
- ~~`upwork-ingest.service`~~ — DISABLED. Custom Upwork scraper that bypasses Vercel and inserts jobs WITHOUT client details. Was causing confusion.

---

# Architecture — How Jobs Flow

> **IMPORTANT:** Jobs are fetched from **TryVibeWorker** (tryvibeworker.com) via the EC2 `vw_ingest.py` script.
> The old custom Upwork scraper (`ingest_uphunt.py`, `upwork-ingest.service`) is **DISABLED** and should NOT be used.

## Job Fetching Pipeline

```
TryVibeWorker API (tryvibeworker.com/api/jobs)
    ↓
EC2: vw_ingest.py (fetches, static-scores against filters)
    ↓
POST /api/jobs/vibeworker (Vercel) — receives raw VW jobs + pre-computed scores
    ↓
Vercel: mapVibeworkerJobsToInserts() → DB insert (jobs + job_scores)
    ↓
Fire-and-forget: analyzeJob() for each scored job (AI analysis via DeepSeek proxy)
    ↓
Dashboard: Jobs list shows client country, spend, hire rate, payment verified
```

## Key Design Decisions
1. **EC2 does ALL heavy lifting** — fetching, filter matching, static scoring. Vercel just writes to DB.
2. **Static pre-filter** (`static-score.ts`) — rule-based 0-100 scoring, threshold ≥30. Saves 60-80% AI calls.
3. **AI analysis is fire-and-forget** — response returns immediately, analysis runs in background.
4. **Vibeworker provides limited client data** — country, totalSpent, hireRate, jobsPosted, paymentVerified. Does NOT provide: proposals_count, client_name, client_industry, client_city, client_company_size.
5. **Inngest** handles `process-cron-jobs` and `process-extension-sync` — NOT used for VW ingest analysis (event key was missing, switched to direct `analyzeJob` calls).

---

# Inngest Functions

| Function | Trigger | Purpose |
|---|---|---|
| `process-cron-jobs` | `app/cron.trigger` | Fetches jobs (old flow), static pre-filters, sends analysis events |
| `analyze-job` | `app/jobs.analyze` | AI-analyzes a single job for a single user |
| `process-extension-sync` | `app/extension.sync` | Handles extension-synced jobs |

**Note:** VW ingest does NOT use Inngest. It calls `analyzeJob()` directly (fire-and-forget).

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
