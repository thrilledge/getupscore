# UpScore — Database Optimization & Retention Plan

> **Date:** 2026-08-12 · **Status:** Draft (awaiting review)
> **Scope:** Full DB analysis + optimization + cron-based job retention for marketing data

---

## 0. TL;DR (Urdu)

- **Jobs table 57,435 rows** hai — 99.7% jobs sirf last 14 din ke hain (market data ke liye zyada purani cheez ki zaroorat nahi).
- **Sabse bada problem:** `description` column (100% populated, up to 10K chars) + GIN trigram index pe hai — storage aur query dono pe bhari.
- **Danger:** abhi EC2 ka `delete_old_jobs` raw `DELETE` karta hai jo `job_analyses`/`saved_jobs`/`proposals` ko **cascade delete** kar sakta hai (20,272 jobs referenced hain — data loss risk).
- **Plan:** marketing ke liye chahiye **7/30/90-day trend window** wali jobs; us se purani unreferenced jobs daily cron se delete hon. Sath hi redundant indexes hatana, description ka weight kam karna, aur marketing stats ko chhoti aggregate table me pre-compute karna.

---

## 1. Current Database State (live analysis, 2026-08-12)

### 1.1 Tables & Row Counts

| Table | Rows | Notes |
|---|---|---|
| `jobs` | **57,435** | 100% `source=upwork_graphql`(22,117) + `vibeworker`(35,281) + extension(13) |
| `job_analyses` | **30,678** | 20,272 distinct jobs referenced |
| `job_scores` | 19 | 19 distinct jobs referenced |
| `saved_jobs` | 1 | 1 job referenced |
| `proposals` | 25 | 1 distinct job referenced |
| `notifications` | 266 | 246 distinct jobs referenced |
| `notification_channels` | 3 | — |
| `notification_rules` | 3 | — |
| `job_filters` | 2 | — |
| `upwork_profiles` | 2 | — |
| `upwork_sessions` | 2 | — |
| `contracts` | 0 | — |
| `work_diary_entries` | 0 | — |
| `user_preferences` | 0 | — |

**FK integrity:** 0 dangling references — saare references valid hain (cleanup abhi tak FK ko nahi toda).

### 1.2 Jobs Age Distribution

**By `posted_at` (Upwork posting date):**

| Bucket | Count | % |
|---|---|---|
| < 1 day | 3,153 | 5.5% |
| 1–3 days | 7,524 | 13.1% |
| 4–7 days | 17,295 | 30.1% |
| 8–14 days | 26,401 | 46.0% |
| 15–30 days | 3,021 | 5.3% |
| 31–60 days | 16 | 0.03% |
| 61–90 days | 1 | ~0% |

**By `created_at` (insert time):** <1d: 4,601 · 1-3d: 6,610 · 4-7d: 15,734 · 8-14d: 27,958 · 15-30d: 2,508 · >30d: **0**

> **Key insight:** `created_at` me kuch bhi 30 din se purana nahi hai — EC2 cleanup `delete_old_jobs` (10-day retention) **abhi kuch had tak chal raha hai**, lekin 2,508 jobs 15–30 din purani bhi maujood hain (inconsistent). `posted_at` me 3,038 jobs 15–90 din purani hain (backfilled/detail-refresh wali).

### 1.3 Column Data Quality (fill rates)

| Column | Fill | Marketing need? |
|---|---|---|
| `title` | 100% | — (search) |
| `description` | **100%** | ❌ NOT needed for trends |
| `posted_at` | 100% | ✅ |
| `job_type` | 100% | ✅ |
| `contractor_tier` | 100% | ✅ |
| `skills` | 99% | ✅ |
| `category` | 61% | ✅ |
| `subcategory` | **0%** | ✅ (data source missing) |
| `client_country` / `client_location_country` | 60% | ✅ |
| `payment_verified` | 44% | ✅ |
| `client_payment_verified` | 48% | ✅ |
| `client_rating` | 60% | ✅ |
| `budget` | 40% | ✅ |
| `hourly_min` | 38% | ✅ |
| `client_total_spend` | 36% | ✅ |

`job_analyses` JSONB avg **~437 bytes/row** (small, no problem).

---

## 2. Problems Found

### P1. Cleanup is unsafe (HIGH)
`scripts/ingest_to_supabase.py → delete_old_jobs()` raw REST `DELETE` on `jobs` karta hai.
`jobs` ke FK constraints sab **`ON DELETE CASCADE`** hain → `job_analyses` (20k+ rows), `saved_jobs`, `proposals`, `notifications`, `job_scores` **user data cascade me delete ho jayega**.
Humein yakeen nahi hai ye risk realize hua hai ya nahi — lekin ye design is-justified nahi.

### P2. `description` storage hog (HIGH)
100% rows pe, up to 10K chars/row. ~57K jobs × ~2-5KB avg ≈ **150–300MB** description hi kha raha hai. Marketing/trends is column ko use hi nahi karta. `idx_jobs_description_trgm` (GIN) bhi bhari hai aur isi pe dependent.

### P3. Redundant / unused indexes (MEDIUM)
- `idx_jobs_upwork_job_id` — **redundant**: UNIQUE constraint already banata hai index on `upwork_job_id`.
- `idx_jobs_proposals_count` — koi query/filter is pe nahi chalta (jobs route me filter nahi).
- `idx_jobs_hours_per_week`, `idx_jobs_client_industry` — filters me use nahi hote.
- `idx_jobs_subcategory` (if exists) — column 0% populated.
- Description GIN trigram — sabse bada index, `title` GIN kafi hai search ke liye.

### P4. `subcategory` dead column (LOW)
0% populated, but code (`filter-form.tsx`, `match.ts`, API) use karta hai. Data source se ye value aana hi nahi. Column rakhna ya hatana — decision chahiye.

### P5. Market trends RPC is expensive (MEDIUM)
`get_market_trends(30)` pehle 6–8s lagta tha (isi session me reproduce hua). Yeh har request pe puri `jobs` table (90-day window) aggregate karta hai. Agar retention 90 din rakhenge to 57k→170k jobs ho sakti hain → ye RPC aur mehnga.

### P6. Secret key hardcoded in systemd (SECURITY)
`scripts/upwork-ingest.service` me `SUPABASE_SERVICE_KEY=sb_secret_...` **plain text me hardcoded** hai. Git repo me commit ho sakta hai. Env reference / `.env` se lena chahiye.

---

## 3. Retention Policy (Recommendation)

### 3.1 Kya rakhein (marketing data)
`get_market_trends` supports **7 / 30 / 90 day** windows → hamain raw jobs ki zaroorat hai:
- **≤ 90 days** (`posted_at`) → 7/30/90 trend windows cover ho jate hain. (Currently sirf 57k jobs hain, 90-day window ~sab kuch.)
- **Referenced jobs** (`job_analyses`, `saved_jobs`, `proposals`, `notifications`, `job_scores`) — chahe kitni bhi purani hon, **kabhi delete nahi** (user data).

### 3.2 Kya delete karein
- Jobs **> 90 days** (posted_at) **AND** kisi bhi user table se **unreferenced**.
- (Optional, aggressive) > 30 days unreferenced, agar marketing 90-day history aggregated table se nikalti hai (Phase 3 se).

### 3.3 Current delete-eligible estimate
Rules `<=14d keep` + `referenced keep` ke sath: **~4,279 jobs** delete candidates (purani + unreferenced). 90-day policy ke sath ye number aur kam hoga kyunki ~sab kuch 14 din ke andar hai. **Yani abhi chota sa historical cleanup chahiye; future me ye policy DB ko bounded rakhegi (~30–90 din).**

---

## 4. Optimization Strategy

### Track A — Safe cleanup cron (main deliverable)
1. Naya RPC `public.cleanup_old_jobs(p_max_days int)`:
   - `p_max_days` default **90**.
   - `DELETE FROM jobs WHERE posted_at < now() - interval 'p_max_days days' AND id NOT IN (SELECT job_id FROM job_analyses) AND id NOT IN (SELECT job_id FROM saved_jobs) AND id NOT IN (SELECT job_id FROM proposals) AND id NOT IN (SELECT job_id FROM notifications) AND id NOT IN (SELECT job_id FROM job_scores) RETURNING id;`
   - Batching (LIMIT 5000/run) taake lock lamba na ho; loop tab tak jab tak deleted rows ho.
2. Call site (choose one):
   - **A1 (recommended):** Vercel cron route `/api/cron/cleanup` with `CRON_SECRET` + `vercel.json` cron `"0 4 * * *"` (daily 4am) — no EC2 dependency.
   - A2: Existing EC2 `upwork-ingest.timer` (every 5 min) me cleanup sub-routine fix — lekin RPC ko call karega (raw REST DELETE nahi).
3. `delete_old_jobs` function in `ingest_to_supabase.py` ko **hatana/disable** karna (unsafe REST DELETE) aur RPC call se replace karna.

### Track B — Schema / storage optimization
1. **Drop redundant indexes:**
   ```sql
   DROP INDEX IF EXISTS idx_jobs_upwork_job_id;        -- redundant (UNIQUE already)
   DROP INDEX IF EXISTS idx_jobs_proposals_count;      -- unused
   DROP INDEX IF EXISTS idx_jobs_hours_per_week;       -- unused
   DROP INDEX IF EXISTS idx_jobs_client_industry;      -- unused
   ```
2. **Description weight kam karna:**
   - Option B1: Purani jobs (>30d) ka `description` truncate/`NULL` karke marketing-only data rakhna:
     ```sql
     UPDATE jobs SET description = NULL
     WHERE posted_at < now() - interval '30 days'
       AND description IS NOT NULL;
     ```
     → storage ka bada hissa wapis aa jata hai. (Beware: `idx_jobs_description_trgm` pe pehle index drop karein warna UPDATE slow.)
   - Option B2: Ingest me `description` ki length `10000 → 2000` kar den (nyi jobs ke liye). Search ke liye 2K chars kafi hai, storage 5x kam.
3. **`subcategory`:** decision — ya to data source fix karein, ya column/UI filter hata dein. (Suggested: abhi column rakhein, sirf documentation note.)

### Track C — Marketing trends optimization
1. Naya **`job_daily_stats`** table (date, job_type, budget_band, hourly_band, category, country, tier, verified, count) — nightly cron aggregate.
2. `get_market_trends` ko rewrite: pehle daily-stats table se fast compute; purani jobs pe heavy scan nahi.
3. Is se `jobs` ki purani rows ka weight bhi kam ho sakta hai (sirf recent + referenced raw jobs rakhen).

### Track D — Security / hygiene
1. `upwork-ingest.service` me hardcoded key ko `.env`/`EnvironmentFile` me move karna (git se bahar).
2. Confirm `.env*` in `.gitignore` (already added, uncommitted) — commit plan me shamil karein.

---

## 5. Implementation Phases

| Phase | Action | Files / SQL | Verify |
|---|---|---|---|
| **0** | ✅ Analysis done (this doc) | — | row counts, age, quality (above) |
| **1** | Create `cleanup_old_jobs` RPC (safe, referenced-keep) | new migration `00022_cleanup_old_jobs.sql` | dry-run SELECT count candidates |
| **2** | Cron route `/api/cron/cleanup` + `vercel.json` schedule | `src/app/api/cron/cleanup/route.ts`, `vercel.json` | manual `POST` with CRON_SECRET → run, log deleted count |
| **3** | Drop redundant indexes + (optional) description cleanup | migration `00023_index_optimization.sql` | `EXPLAIN` on jobs queries; storage delta |
| **4** | Fix EC2 ingest (replace REST DELETE with RPC call) | `scripts/ingest_to_supabase.py`, `.service` env fix | EC2 log check |
| **5** | (Optional) `job_daily_stats` + trends RPC rewrite | migration + `src/lib/jobs/trends.ts` | `get_market_trends(30)` < 1s |
| **6** | Observe 1 week: jobs count bounded (~30–90d), no dangling refs | cron logs + FK check script | rerun analysis |

---

## 6. Rollback / Safety

- **RPC DELETE** uses `RETURNING id` + logs count → hamesha pata rahega kitna delete hua.
- **Never** delete referenced jobs (guard in WHERE). Referenced = user ki analyses/saved/proposals/notifications/scores.
- Pehle `BEGIN; DELETE ... ; SELECT count; ROLLBACK;` dry-run test karein live pe.
- Index drops are safe (`IF EXISTS`), read queries peak hours me slow ho sakte hain — off-peak (4am) pe run karein.
- Description `NULL` update reversible? No — pehle decide karein, ya archive table me copy karein.

---

## 7. Open Questions (user ko morning me)

1. **Retention window:** 90 days final? (aggressive 30 days + aggregate stats?) — affects `job_daily_stats` scope.
2. **Description cleanup:** purani jobs (>30d) ka description `NULL` karna OK? Ya full text archive chahiye?
3. **Cleanup cron host:** Vercel cron (recommended) ya EC2? (Vercel = app ke sath, no extra infra; EC2 = already running).
4. **`subcategory`:** data source fix karein ya column/filter remove? (currently 0% data, UI me active filter hai).
5. **`job_daily_stats`** Phase 5 abhi karein ya pehle raw retention (Phase 1–4) deploy kar ke observe karein?

---

## 8. Appendices

### A. Commands to re-run analysis
- Node + `supabase-js` scripts (`age`, `quality`, `ref`, `delcand`) — temp me, reusable.
- FK check: `SELECT job_id FROM <table>` paginate + intersect with `jobs.id`.

### B. Related code locations
- Ingest cron (Vercel): `src/app/api/jobs/cron/route.ts`
- Jobs list API: `src/app/api/jobs/route.ts`
- Fetch providers: `src/lib/jobs/fetcher.ts`, `vibeworker.ts`
- Trends RPC: `supabase/migrations/00021_performance_indexes.sql` (current), `00018`, `00020`
- EC2 ingest: `scripts/ingest_to_supabase.py`, `scripts/upwork-ingest.{service,timer}`
- Filter matching: `src/lib/filters/match.ts`
