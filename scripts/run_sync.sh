#!/bin/bash
# Upwork MCP periodic sync wrapper
# search -> get details per job -> save to Supabase (dedupe handled by python script)
# then trigger analysis fanout on Vercel
#
# Reads jobs_per_sync + sync_interval_minutes from the upwork_mcp_config row in
# Supabase (editable from the admin panel). The systemd timer fires every minute;
# this script self-throttles to the configured interval.

set -a
source /etc/upwork-mcp.env
set +a

cd /root/mcp-client

echo "=== run_sync $(date -Is) ==="

# ---- read config ----
CFG=$(python3 /root/mcp-client/mcp_config.py --get 2>/dev/null || echo '{}')
JOBS_PER_SYNC=$(echo "$CFG" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("jobs_per_sync",10) or 10)')
INTERVAL_MIN=$(echo "$CFG" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("sync_interval_minutes",5) or 5)')
LAST_SYNC=$(echo "$CFG" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("last_sync_at") or "")')
echo "config: jobs=$JOBS_PER_SYNC interval=${INTERVAL_MIN}m last_sync=$LAST_SYNC"

# ---- throttle: skip if a sync already ran within the interval ----
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
if [ -n "$LAST_SYNC" ] && [ "$LAST_SYNC" != "null" ]; then
  python3 - "$INTERVAL_MIN" "$LAST_SYNC" "$NOW" <<'PY' || exit 0
import sys, datetime
interval_min, last, now = float(sys.argv[1]), sys.argv[2], sys.argv[3]
try:
    last_dt = datetime.datetime.fromisoformat(last.replace("Z", "+00:00"))
    now_dt = datetime.datetime.fromisoformat(now.replace("Z", "+00:00"))
    if (now_dt - last_dt).total_seconds() < interval_min * 60:
        sys.exit(1)  # still inside the window → skip
except Exception:
    pass
sys.exit(0)
PY
fi
echo "window elapsed — running sync"

# ---- sync (limit = jobs_per_sync) ----
# no org arg: the MCP client picks the healthy pool slot and uses that account's
# own org_uid, auto-refreshing or rotating to the next account when one dies.
JOBS_PER_SYNC=$JOBS_PER_SYNC /usr/bin/node /root/mcp-client/mcp_client.js sync mcp_get_jobs.json save_get_jobs_to_db.py
# record stats (saved count = rows in the json we just wrote)
SAVED=$(python3 -c 'import json;print(len(json.load(open("/root/mcp-client/mcp_get_jobs.json"))))' 2>/dev/null || echo 0)
python3 /root/mcp-client/mcp_config.py --set-sync "$SAVED" "$NOW" 2>/dev/null || echo "warn: could not record last_sync"

# Trigger analysis (static pre-filter + AI analyze fanout on Vercel)
curl -s -o /dev/null -w "analysis-trigger http:%{http_code}\n" \
  -X POST 'https://www.getupscore.com/api/jobs/cron' \
  -H "Authorization: Bearer $CRON_SECRET"