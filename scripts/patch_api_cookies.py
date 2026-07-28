#!/usr/bin/env python3
"""Patch upwork_api.py to use persistent cookie path"""
import re

with open("/home/ubuntu/upwork-api/upwork_api.py", "r") as f:
    content = f.read()

# Replace COOKIE_FILE to use persistent path
content = content.replace(
    'COOKIE_FILE = "/tmp/upwork_cookies.json"',
    'COOKIE_FILE = "/app/cookies/upwork_cookies.json"'
)

# Also update _save_cookies to create directory
old_save = '''def _save_cookies(cookies: dict):
    with open(COOKIE_FILE, "w") as f:
        json.dump(cookies, f)'''

new_save = '''def _save_cookies(cookies: dict):
    import os
    os.makedirs(os.path.dirname(COOKIE_FILE), exist_ok=True)
    with open(COOKIE_FILE, "w") as f:
        json.dump(cookies, f)'''

content = content.replace(old_save, new_save)

with open("/home/ubuntu/upwork-api/upwork_api.py", "w") as f:
    f.write(content)

print("Patched!")
