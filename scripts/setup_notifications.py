"""
Test notification system end-to-end.
Creates a channel + rule, sends a test email via Nodemailer SMTP.
"""
import os
import sys
import json
from urllib.request import Request, urlopen


def main():
    supabase_url = os.environ["SUPABASE_URL"]
    service_key = os.environ["SUPABASE_SERVICE_KEY"]

    # 1. Get the user ID
    user_email = "usamaadeel1183@gmail.com"
    print(f"Looking up user: {user_email}")

    # Use auth admin to get user by email
    auth_url = f"{supabase_url}/auth/v1/admin/users"
    req = Request(auth_url, headers={
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept": "application/json",
    })
    with urlopen(req, timeout=10) as resp:
        users = json.loads(resp.read())
        users_list = users.get("users", [])
        user = next((u for u in users_list if u.get("email") == user_email), None)
        if not user:
            print(f"User not found: {user_email}")
            sys.exit(1)
        user_id = user["id"]
        print(f"User ID: {user_id}")

    # 2. Check existing channels
    channels_url = f"{supabase_url}/rest/v1/notification_channels?user_id=eq.{user_id}&select=id,name,type,config,is_active"
    req = Request(channels_url, headers={
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept": "application/json",
    })
    with urlopen(req, timeout=10) as resp:
        channels = json.loads(resp.read())
        print(f"\nExisting channels: {len(channels)}")
        for ch in channels:
            print(f"  {ch['name']} ({ch['type']}) - active={ch['is_active']} config={ch['config']}")

    # 3. Check existing rules
    rules_url = f"{supabase_url}/rest/v1/notification_rules?user_id=eq.{user_id}&select=id,channel_id,match_score_min,opportunity_score_min,is_active"
    req = Request(rules_url, headers={
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept": "application/json",
    })
    with urlopen(req, timeout=10) as resp:
        rules = json.loads(resp.read())
        print(f"\nExisting rules: {len(rules)}")
        for r in rules:
            print(f"  channel={r['channel_id']} match>={r['match_score_min']} opp>={r['opportunity_score_min']} active={r['is_active']}")

    # 4. Create email channel if none exists
    email_channel = next((ch for ch in channels if ch["type"] == "email"), None)
    if not email_channel:
        print("\nCreating email channel...")
        create_url = f"{supabase_url}/rest/v1/notification_channels"
        data = json.dumps({
            "user_id": user_id,
            "name": "My Email",
            "type": "email",
            "config": {"to": user_email},
            "is_active": True,
        }).encode()
        req = Request(create_url, data=data, method="POST", headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        })
        with urlopen(req, timeout=10) as resp:
            email_channel = json.loads(resp.read())[0]
            print(f"  Created: {email_channel['id']}")
    else:
        print(f"\nUsing existing email channel: {email_channel['id']}")

    # 5. Create rule if none exists for this channel
    existing_rule = next((r for r in rules if r["channel_id"] == email_channel["id"]), None)
    if not existing_rule:
        print("Creating notification rule (match>=50, opp>=50)...")
        create_url = f"{supabase_url}/rest/v1/notification_rules"
        data = json.dumps({
            "user_id": user_id,
            "channel_id": email_channel["id"],
            "match_score_min": 50,
            "opportunity_score_min": 50,
            "max_proposals": 50,
            "is_active": True,
        }).encode()
        req = Request(create_url, data=data, method="POST", headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        })
        with urlopen(req, timeout=10) as resp:
            rule = json.loads(resp.read())[0]
            print(f"  Created rule: {rule['id']}")
    else:
        print(f"Using existing rule: {existing_rule['id']}")

    print("\nSetup complete! Channel + Rule are ready.")
    print("Use the Send Test button in the UI, or call POST /api/notifications/send")


if __name__ == "__main__":
    main()
