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
- **Supabase CLI token:** `sbp_fc41800813f33a7e29cf71517499431cfb0473ce`

## Vercel
- **Team:** `team_hnK4nKqwTWyvOuQWidykA5nC`
- **Project:** `prj_RNGyqa8sJsqVMIufzVcCcAbPoIyM`
- **Vercel token:** `vcp_3mmQyZ6eee2hTEwZFdYUgNYLrBZk4ZcbU4rkyLFceA92bIn2bB3Bp5HF`
- **Deploy command:** `npx vercel --token "vcp_3mmQyZ6eee2hTEwZFdYUgNYLrBZk4ZcbU4rkyLFceA92bIn2bB3Bp5HF" --prod --yes`
- **Production URL:** `https://www.getupscore.com`

## AI / LLM
- **Groq API key Chain:** `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` (env: `GROQ_API_KEY`)
- **Primary model:** `openai/gpt-oss-20b` via Groq
- **Pro Free Models:** `https://profreemodels.vercel.app/api/v1` (env: `PROFREEMODELS_API_KEY`, model: `claude-sonnet-5`)

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
- **User:** user: root | password: Pu9Ia6AKwRNc2
- **OS:** Ubuntu 24.04.4 LTS, Node v22, Python 3.12
- **Scripts path:** `/root/mcp-client/`
- **Env file:** `/etc/upwork-mcp.env` (SUPABASE_URL + SUPABASE_SERVICE_KEY)
- **Log:** `/var/log/upwork-mcp-sync.log`

### Active services
- **`upwork-mcp-sync.service`** + **`upwork-mcp-sync.timer`** — MCP job sync (every 5 min)
- **Run now:** `systemctl start upwork-mcp-sync.service`
- **Check:** `systemctl list-timers | grep upwork`, `tail -30 /var/log/upwork-mcp-sync.log`

### Firewall / exposure (2026-09-21, ACTIVE)
- **UFW is ON** — only **22/80/443** open publicly; everything else dropped.
  Verify: `ufw status` → expect exactly `22/tcp, 80/tcp, 443/tcp` (v4+v6).
- **Ollama REMOVED** (was exposed on `:11434`; binary + systemd unit + `/usr/local/lib/ollama` + `/root/.ollama` deleted).
- `opencode` agent server still binds `:4096` and `openwa` proxies `:2785`, but **UFW blocks external access** — if either must be reached remotely, add an explicit rule (currently intentionally closed).
- `OPENWA_BASE_URL=http://144.91.85.40/openwa` → the app reaches WhatsApp via **port 80** (nginx), so UFW-80 stays open.

### ⚠️ Contabo DDoS mitigation — history & diagnosis (2026-09-21)
Do NOT re-diagnose from scratch if web/flaky symptoms return; read this first. Symptoms were:
`db.getupscore.com` (and studio) intermittently dropped **inbound TCP** on 443/8000 (~15s connect, 21s timeouts, `fetch failed`), while **SSH :22 stayed fast** and local VPS→nginx was instant (14ms). NIC showed **0 RX drops**. This produced: `/api/jobs` 500s, slow `/settings`, and GoTrue errors like `AuthRetryableFetchError` / message `"{}"` / `ConnectTimeoutError: db.getupscore.com:443 timeout 10000ms`.

- **Root cause:** Contabo **auto anti-DDoS/abuse mitigation** on IP `144.91.85.40`, triggered by a **SYN flood on port 8787** (kernel log `Possible SYN flooding on port 0.0.0.0:8787. Sending cookies`, Sep 10) + constant router-exploit scanners (`GponForm/diag_Form` probes in `/var/log/nginx/error.log`) + the previously open Ollama. Mitigation filters inbound TCP per-IP with SSH as an exception.
- **Applied fixes:** removed Ollama; UFW lockdown (above); **Contabo ticket created 2026-09-21** from `my.contabo.com → My Tickets → IP/Network Configuration` (ask them to clear mitigation on 144.91.85.40).
- **Status:** connectivity recovered — TCP 443 ~150ms, health API 0.6-1.6s stable. If drops recur, re-run: `ssh-one.py "systemctl is-active nginx; dmesg -T | grep -i syn"` + TCP test from Windows, and re-open the ticket.
- **Durable fix (still PENDING, not installed):** **Cloudflare Tunnel** on the VPS (outbound-only) so inbound TCP to the IP is never needed. User offered; ask again if flakiness returns.

### 📬 Email/SMTP — Resend swap PENDING
- GoTrue on the VPS currently sends mail via **Hostinger** (`smtp.hostinger.com:465`, SENDER `hello@getupscore.com`). Works, but deliverability/scale is poor.
- Plan: switch to **Resend** (`smtp.resend.com:465`, user=`resend`, pass=Resend API key) in `/opt/supabase-project/.env` (`GOTRUE_SMTP_*`), then `docker compose restart` (supabase stack on 144.91.85.40).
- **BLOCKED on user providing a Resend API key.** No `RESEND_API_KEY` exists in `.env.local`/Vercel yet.

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
- **Apply (self-host on VPS):** `python "C:\Users\Usama\AppData\Local\Temp\opencode\ssh-psql.py" <sql-file>` — runs the file via `docker exec -i supabase-db psql -U postgres -d postgres` over SSH (root@144.91.85.40). There is **no `schema_migrations` table** in the self-host DB, so each migration file is applied manually and must be idempotent (`DROP FUNCTION IF EXISTS`/`CREATE OR REPLACE`). For arbitrary VPS commands: `ssh-one.py "<cmd>"`.
- **SSH scripts live in `C:\Users\Usama\AppData\Local\Temp\opencode\`** (`ssh-one.py`, `ssh-psql.py`, `dur_backfill.sql`, `mig_00048_fast.sql`, etc.). SSH is flaky — retry, one command per connection.
- **Last migration APPLIED to DB:** `00048_jobs_feed_respects_user_filters.sql`. The repo file now matches the LIVE version (strict feed gate variant).

### ⚠️ search_jobs / jobs-feed changes (2026-09-21, LIVE)
- The jobs feed is now **gated by each user's ACTIVE `job_filters`**: a job is visible only if it matches ≥1 active filter, OR is explicitly saved (`p_ids`). The old "analysis-bypass" branch was removed — a stale/relevant analysis no longer injects non-matching jobs into the feed.
- Keyword matching = **OR + whole-word, case-insensitive** (so `react` does NOT match "reaction"), scoped to title/skills/category/subcategory — NOT description. Same semantics in SQL gate (`[[:<:]]term[[:>:]]`) and in `src/lib/filters/match.ts` (`containsKeyword` regex).
- **Performance fix:** `user_filter_matches_job` was rewritten to take the job's **columns as args** (12-arg signature) instead of re-SELECTing the job per row — `search_jobs` dropped from ~9s to 0.5-2.3s with `p_search`. Old `(uuid, uuid)` overload was dropped.
- Main user for testing: `f2910d78-7dc8-44eb-b87d-463bf03886b8` (usamaadeel1183@gmail.com).

### App-side fixes shipped 2026-09-21 (all deployed)
- **Edit-filter dialog fixed:** `FilterCard` previously never mounted `<FilterFormDialog>` (state was set but dialog absent). Now mounted; form also `reset()`s on open/filter-change (controlled dialogs never fire `onOpenChange`). Filters page invalidates `["job_filters", user.id]` on create/edit/toggle/delete.
- **Settings:** Extension API Tokens section removed (dead handlers/imports too). `sendPasswordReset` hardened — never surfaces raw `{}`; one retry (2.5s) on transient network errors; logs `[settings] resetPasswordForEmail failed` with full error JSON when it fails.
- **Market Trends:** auto-defaults scope to "filters" when the user has active filters (unless manually overridden).
- **`/api/jobs` resilience:** `cacheGetStale()` fallback in `src/lib/cache.ts` — on DB failure the last-good cached jobs are served (`stale:true`) instead of a 500.

---

# k6 QA (getupscore.com)

- **Script:** `k6/product-qa.js` — `landing` (10 VU, 45s) + `authed` (4 VU, 45s) scenarios. FULLY GREEN: `exit 0` (checks >98%, http_req_failed <2%). Last verified 2026-09-22.
- **Run from repo root:** `& "C:\Users\Usama\AppData\Local\Temp\opencode\k6\k6-v2.3.0-windows-amd64\k6.exe" run k6/product-qa.js --no-usage-report --summary-trend-stats="min,avg,p(95),p(99),max" -e BASE_URL="https://www.getupscore.com" -e AUTH_URL="https://db.getupscore.com" -e ANON_KEY=<servicekey> -e SERVICE_KEY=<servicekey>`
- **Auth in QA script:** creates a throwaway user via VPS GoTrue admin API → password-token → builds the supabase-ssr session cookie `sb-db-auth-token=base64-<base64url(sessionJSON)>` (chunked at 3180 chars). Prod Supabase = VPS `https://db.getupscore.com` (NOT cloud). Service key from `/etc/upwork-mcp.env` on the VPS; pass via `-e` at runtime, never embed.
- **⚠ `next-error` gotcha:** `body.includes("next-error")` is NOT a valid failure check — the App Router `next-error`/404 slot is constant boilerplate present in EVERY healthy response (e.g. `/login`). Check pages with `status === 200 && body.includes("UpScore")` instead.
- **Expected non-200s must use `responseCallback: http.expectedStatuses(401 / 3xx)`** so they don't trip `http_req_failed` (guest-API 401 and guest-page→/login redirects are intentional).
- **Known environmental flakiness (NOT the app):** from this Windows box, TCP connects to both Vercel edge (`www.getupscore.com`) and VPS (`db.getupscore.com`) intermittently time out (~0–8% of requests; bursts of `status:0` / `connect timeout`). VPS→edge is clean (10/10 × 200, <0.9s). If QA runs fail on `status:0`, re-run — the app passes every check when the edge is reachable.

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

---

# Google OAuth — PENDING: Branding Verification (TODO)

> Google "Sign in with Google" backend is FULLY configured and working (verified end-to-end live).
> But the OAuth consent screen is stuck in **unverified / testing mode** because of ONE pending
> item below. Do this to remove the "Google hasn't verified this app" warning and publish for everyone.

## Status (done, do not redo)
- Backend (self-host Supabase on VPS): `EXTERNAL_GOOGLE_*` set, `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://db.getupscore.com/auth/v1/callback`, `API_EXTERNAL_URL=https://db.getupscore.com/auth/v1` (see `/opt/supabase-project/.env` + `docker-compose.yml` on 144.91.85.40).
- Google OAuth Client: ID `745159433920-269msh70fpj7q6g2erugaaujkeiiflnd.apps.googleusercontent.com`, Secret `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` (in `/opt/supabase-project/.env`). DO NOT publish this secret here again.
- Authorized redirect URI (Google Console): `https://db.getupscore.com/auth/v1/callback` ✅
- Authorized domain (Google Console): `getupscore.com` ✅ (must be the apex domain, NOT `db.getupscore.com`)
- `/privacy` now public (middleware fixed to allow `/privacy /terms /security /status /affiliate`) — HTTP 200 with full 9-section policy ✅

## ⛔ REMAINING ISSUE (the one that blocks verification)
**Google error on consent screen:**
> "The website of your home page URL 'https://www.getupscore.com' is not registered to you.
> Verify ownership of your home page."

Fix = verify domain ownership of `getupscore.com` in Google Search Console:

1. Open <https://search.google.com/search-console>
2. **Add property → Domain** → enter `getupscore.com`
3. Copy the **TXT record** Google gives you (like `google-site-verification=...`)
4. Add that **TXT record** at your DNS provider for the `@`/apex of `getupscore.com`
   (same place where the `db` and `studio` A records were added → 144.91.85.40)
5. Click **Verify** in Search Console (may take a few min to propagate)
6. Back in Google Cloud Console → OAuth consent screen → **"I have fixed the issues"** → re-verification

Only after the domain is verified will Google allow the consent screen to be **published**
so users other than the test user can sign in with Google.

## If privacy page error ever reappears
The `/privacy` issue ("does not have sufficient content") is already fixed — content lives in
`src/app/(landing)/privacy/page.tsx`. If Google re-flags it, ensure the page is reachable WITHOUT
auth (see `src/lib/supabase/middleware.ts` → `isPublicPage`) and that the deploy is current.
