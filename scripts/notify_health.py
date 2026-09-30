#!/usr/bin/env python3
"""Email the admin when the Upwork MCP token needs attention.

Runs from run_sync.sh every minute (the systemd timer tick) and watches the
slot pool written by token_pool.js. Two things are worth an email:

  * the access token has 2h or less left  -> it will self-renew, but if that
    ever stops working you want to know before ingestion dies
  * the slot is not usable at all (expired / refresh revoked / needs a
    reconnect) -> ingestion is degraded or stopped

Emails are de-duplicated through a small state file so a condition that
persists does not mail every minute: one alert when the state changes, then
a reminder every NOTIFY_REMINDER_HOURS, then one "recovered" note when the
account becomes healthy again.

Configuration (environment):
  UPWORK_NOTIFY_EMAIL   recipient, default admin@getupscore.com
  SMTP_HOST             default smtp.hostinger.com
  SMTP_PORT             default 465 (implicit TLS)
  SMTP_USER             sender / SMTP login
  SMTP_PASSWORD         SMTP password
  SMTP_FROM             optional envelope-from, defaults to SMTP_USER
  NOTIFY_REMINDER_HOURS repeat interval while a problem persists, default 6
  NOTIFY_EXPIRY_HOURS   warn when this much or less is left, default 2
  NOTIFY_DRYRUN         set to 1 to print instead of sending

Always exits 0: a mail problem must never break job ingestion.
"""

import datetime as dt
import json
import os
import smtplib
import socket
import subprocess
import sys
from email.message import EmailMessage

MCP_DIR = "/root/mcp-client"
POOL_DIR = os.path.join(MCP_DIR, ".mcp", "pool")
STATE_FILE = os.path.join(POOL_DIR, "_notified.json")
ADMIN_URL = "https://www.getupscore.com/admin/upwork-token"

USABLE = ("ok", "expiring")


def log(msg):
    print(f"[notify] {msg}", flush=True)


def env_int(name, default):
    try:
        return int(float(os.environ.get(name, "") or default))
    except (TypeError, ValueError):
        return default


def now():
    return dt.datetime.now(dt.timezone.utc)


def read_json(path, fallback):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return fallback


def write_json(path, data):
    try:
        tmp = f"{path}.tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
        os.replace(tmp, path)
    except Exception as exc:  # pragma: no cover - disk issues
        log(f"could not persist state: {exc}")


def pool_summary():
    """Ask the node client for the authoritative pool view (no tokens in it)."""
    script = (
        'const p=require("./token_pool");'
        'process.stdout.write(JSON.stringify(p.summary()));'
    )
    proc = subprocess.run(
        ["node", "-e", script],
        cwd=MCP_DIR,
        capture_output=True,
        text=True,
        timeout=60,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"pool summary failed: {(proc.stderr or '').strip()[:200]}")
    return json.loads(proc.stdout or "{}")


def human_left(seconds):
    seconds = int(max(0, seconds or 0))
    hours, rem = divmod(seconds, 3600)
    minutes = rem // 60
    if hours:
        return f"{hours}h {minutes}m"
    if minutes:
        return f"{minutes}m"
    return f"{seconds}s"


def classify(slot, expiry_hours):
    """Map a slot to a notification state, or None when all is well."""
    status = slot.get("status") or "unknown"
    left = int(slot.get("seconds_left") or 0)
    has_refresh = bool(slot.get("has_refresh"))
    warn_seconds = expiry_hours * 3600

    if status not in USABLE:
        return "down"
    if left <= warn_seconds:
        # Self-heals on its own while a refresh token exists; without one it
        # will fail at expiry, so it deserves a louder label.
        return "expiring_no_refresh" if not has_refresh else "expiring_soon"
    return None


def describe(state, slot, summary):
    label = slot.get("label") or f"slot {slot.get('slot')}"
    org = slot.get("org_uid") or "unknown"
    status = slot.get("status") or "unknown"
    left = human_left(slot.get("seconds_left"))

    healthy = [s for s in summary.get("slots", []) if (s.get("status") or "") in USABLE]
    active = summary.get("active_slot")

    if state == "no_account":
        head = "No Upwork account is connected."
        impact = "Job syncing is STOPPED. Connect an account to resume."
    elif state == "recovered":
        head = f'Upwork account "{label}" is healthy again (status: {status}).'
        impact = "Self-renewal worked; no action needed." if healthy else "No other usable account is available."
    elif state == "down":
        head = f'Upwork account "{label}" is not usable (status: {status}).'
        impact = (
            "Job syncing is STOPPED."
            if not healthy
            else f"Still syncing from another slot ({active})."
        )
    elif state == "expiring_no_refresh":
        head = f'Upwork account "{label}" has no refresh token and expires in {left}.'
        impact = (
            "It cannot renew itself, so syncing will stop at expiry."
            if not healthy
            else f"Still syncing from another slot ({active})."
        )
    else:
        head = f'Upwork account "{label}" expires in {left} (status: {status}).'
        impact = (
            "It should renew itself automatically. No action needed unless a later "
            "email says otherwise."
        )

    rows = [
        head,
        "",
        f"Impact: {impact}",
        f"Slot: {slot.get('slot') if slot else '-'}",
        f"Account: {label}",
        f"Org UID: {org}",
        f"Status: {status}",
        f"Token left: {left}",
        f"Expires at: {slot.get('expires_at') if slot else '-'}",
    ]
    if slot and slot.get("has_refresh") is False:
        rows.append("Refresh token: missing (cannot auto-renew)")
    if slot and slot.get("last_error"):
        rows.append(f"Last error: {slot['last_error']}")
    if slot and slot.get("last_refreshed_at"):
        rows.append(f"Last renewed: {slot['last_refreshed_at']}")
    if slot and slot.get("last_used_at"):
        rows.append(f"Last used: {slot['last_used_at']}")
    rows.append("")
    rows.append(f"Reconnect here: {ADMIN_URL}")
    return "\n".join(rows)


def subject_for(state, slot, kind):
    if state == "no_account":
        who = "no account"
    else:
        who = slot.get("label") or f"slot {slot.get('slot')}"
    words = {
        "down": "not usable",
        "expiring_soon": "expiring soon",
        "expiring_no_refresh": "expiring, cannot auto-renew",
        "recovered": "back to healthy",
    }
    prefix = {"alert": "ACTION", "reminder": "STILL", "recovered": "FIXED"}[kind]
    return f"[UpScore] {prefix}: Upwork token {words.get(state, state)} - {who}"


def send_mail(to_addr, subject, body):
    host = os.environ.get("SMTP_HOST", "smtp.hostinger.com")
    port = env_int("SMTP_PORT", 465)
    user = os.environ.get("SMTP_USER", "")
    password = os.environ.get("SMTP_PASSWORD", "")
    sender = os.environ.get("SMTP_FROM") or user

    if not user or not password:
        log("SMTP_USER/SMTP_PASSWORD not set - skipping email delivery")
        return False

    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to_addr
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        with smtplib.SMTP_SSL(host, port, timeout=30) as smtp:
            smtp.login(user, password)
            smtp.send_message(msg)
        log(f"sent: {subject}")
        return True
    except (smtplib.SMTPException, OSError, socket.timeout) as exc:
        log(f"email failed ({type(exc).__name__}: {exc})")
        return False


def main():
    recipient = os.environ.get("UPWORK_NOTIFY_EMAIL", "admin@getupscore.com")
    reminder_hours = env_int("NOTIFY_REMINDER_HOURS", 6)
    expiry_hours = env_int("NOTIFY_EXPIRY_HOURS", 2)
    dry = os.environ.get("NOTIFY_DRYRUN", "") in ("1", "true", "yes")

    try:
        summary = pool_summary()
    except Exception as exc:
        log(f"could not read pool ({exc}) - skipping this tick")
        return 0

    state = read_json(STATE_FILE, {})
    if not isinstance(state, dict):
        state = {}
    stamp = now()
    changed = False

    def deliver(kind, key, st, slot):
        subject = subject_for(st, slot, kind)
        body = describe(st, slot, summary)
        if dry:
            log(f"[dry-run] {subject}\n{body}\n")
            return True
        return send_mail(recipient, subject, body)

    slots = summary.get("slots", [])

    # A pool with no slots at all is its own alert.
    if not slots:
        rec = state.get("pool") or {}
        if not rec or rec.get("state") != "no_account":
            if deliver("alert", "pool", "no_account", None):
                state["pool"] = {"state": "no_account", "sent_at": stamp.isoformat()}
                changed = True
        elif (stamp - dt.datetime.fromisoformat(rec["sent_at"])).total_seconds() >= reminder_hours * 3600:
            if deliver("reminder", "pool", "no_account", None):
                state["pool"]["sent_at"] = stamp.isoformat()
                changed = True
    else:
        state.pop("pool", None)
        changed = True

    for slot in slots:
        key = f"slot-{slot.get('slot')}"
        st = classify(slot, expiry_hours)
        rec = state.get(key) or {}

        if st is None:
            if rec.get("notified"):
                # It came back on its own - close the loop for the admin.
                if deliver("recovered", key, "recovered", slot):
                    changed = True
            state.pop(key, None)
            changed = True
            continue

        if rec.get("state") != st or not rec.get("notified"):
            kind = "alert"
        else:
            try:
                age = (stamp - dt.datetime.fromisoformat(rec["sent_at"])).total_seconds()
            except Exception:
                age = reminder_hours * 3600
            if age < reminder_hours * 3600:
                continue
            kind = "reminder"

        if deliver(kind, key, st, slot):
            state[key] = {"state": st, "sent_at": stamp.isoformat(), "notified": True}
            changed = True

    state["last_checked_at"] = stamp.isoformat()
    if changed:
        write_json(STATE_FILE, state)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # never let alerting break ingestion
        log(f"unexpected error: {exc}")
        sys.exit(0)
