#!/bin/bash
cd /home/ubuntu/upwork-api
nohup docker exec upwork-api python3 /app/backfill_client_details.py > /home/ubuntu/upwork-api/backfill.log 2>&1 &
echo $!
