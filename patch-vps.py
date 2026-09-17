# -*- coding: utf-8 -*-
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("144.91.85.40", username="root", password="Pu9Ia6AKwRNc2", timeout=15)

run_sync = r'''#!/bin/bash
# Upwork MCP periodic sync wrapper
# search -> get details per job -> save to Supabase (dedupe handled by python script)
# then trigger analysis fanout on Vercel

set -a
source /etc/upwork-mcp.env
set +a

cd /root/mcp-client

echo "=== run_sync $(date -Is) ==="
/usr/bin/node /root/mcp-client/mcp_client.js sync 1658109706005303297 mcp_get_jobs.json save_get_jobs_to_db.py

# Trigger analysis (static pre-filter + AI analyze fanout on Vercel)
curl -s -o /dev/null -w "analysis-trigger http:%{http_code}\n" \
  -X POST 'https://www.getupscore.com/api/jobs/cron' \
  -H "Authorization: Bearer $CRON_SECRET"
'''

c.exec_command("cp /root/mcp-client/run_sync.sh /root/mcp-client/run_sync.sh.bak3")

sf = paramiko.SFTPClient.from_transport(c.get_transport())
with sf.open("/root/mcp-client/run_sync.sh", "w") as f:
    f.write(run_sync)
sf.close()

cmd = "grep -q CRON_SECRET /etc/upwork-mcp.env || echo 'CRON_SECRET=0b34f5d0f122f313ad8668ddad9ebe8f' >> /etc/upwork-mcp.env"
i, o, e = c.exec_command(cmd)
o.read(); e.read()

i, o, e = c.exec_command("cat /root/mcp-client/run_sync.sh && echo ---ENV--- && cat /etc/upwork-mcp.env")
print(o.read().decode()[:2000])
print("ERR:", e.read().decode()[:300])

i, o, e = c.exec_command("curl -s -o /dev/null -w '%{http_code}' -X POST 'https://www.getupscore.com/api/jobs/cron' -H 'Authorization: Bearer 0b34f5d0f122f313ad8668ddad9ebe8f'")
print("cron endpoint status:", o.read().decode())
c.close()