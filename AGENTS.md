<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# EC2 Deployment

- **Host:** 13.48.204.110
- **User:** ubuntu
- **PEM key:** `C:\Users\Usama\Downloads\mylogikeypair.pem`
- **SSH command:** `ssh -i C:\Users\Usama\Downloads\mylogikeypair.pem ubuntu@13.48.204.110`
- **SCP copy:** `scp -i C:\Users\Usama\Downloads\mylogikeypair.pem <local_file> ubuntu@13.48.204.110:<remote_path>`
- **Docker container:** `upwork-api` on port 8000 → nginx on port 80
- **Scripts path on EC2:** `/home/ubuntu/upwork-api/`
- **Ingest service:** `upwork-ingest.service` + `upwork-ingest.timer` (every 5 min)
- **Restart ingest:** `sudo systemctl restart upwork-ingest.timer && sudo systemctl start upwork-ingest.service`
