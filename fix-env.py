# -*- coding: utf-8 -*-
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("144.91.85.40", username="root", password="Pu9Ia6AKwRNc2", timeout=15)

# Rewrite env file cleanly
env_content = "SUPABASE_URL=https://kjfqtenfmxdoyjxxnhnm.supabase.co\nSUPABASE_SERVICE_KEY=sb_secret_dI5gwLE0HaNKXRXWQlgcJg_IRwEZmKU\nCRON_SECRET=0b34f5d0f122f313ad8668ddad9ebe8f\n"

sf = paramiko.SFTPClient.from_transport(c.get_transport())
with sf.open("/etc/upwork-mcp.env", "w") as f:
    f.write(env_content)
sf.close()

i, o, e = c.exec_command("cat /etc/upwork-mcp.env")
print(o.read().decode())
c.close()