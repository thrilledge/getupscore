# -*- coding: utf-8 -*-
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("144.91.85.40", username="root", password="Pu9Ia6AKwRNc2", timeout=15)

cmd = "cd /root/mcp-client && set -a && source /etc/upwork-mcp.env && set +a && curl -s -o /dev/null -w '%{http_code}' -X POST 'https://www.getupscore.com/api/jobs/cron' -H \"Authorization: Bearer $CRON_SECRET\""
i, o, e = c.exec_command(cmd)
print("status:", o.read().decode())
print("ERR:", e.read().decode()[:300])
c.close()