# Multi-User Upwork MCP Client — Full Setup Guide

## Quick answer to your question

**Yes — multiple users can connect and use it at the same time, and it's easy on their end.**

- Each user's connection is fully independent. Upwork's MCP server only ever sees the one account tied to the token you send it — there's no shared state between User A and User B.
- On the user's side, it's one click: "Connect Upwork" → Upwork login screen → redirected back, done. No technical steps for them.
- On your side, concurrency is free *if* you don't hold connections open per user (see Phase 6). Open a connection, do the work, close it. That's what makes 10 users and 10,000 users the same amount of engineering effort.

The only thing that scales badly is holding a persistent MCP session open for every connected user whether they're active or not. Don't do that — open on demand.

---

## Architecture in one line

Your backend is the MCP client. One codebase, one OAuth flow repeated per user, one token vault, one function that opens a short-lived MCP connection using whichever user's token is relevant to that request. Your own AI decides *what* to call — this guide covers the connection plumbing, not tied to any specific AI provider.

---

## Phase 1 — Database schema (Supabase)

```sql
create table connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  service text not null default 'upwork',
  access_token text not null,      -- encrypted before insert
  refresh_token text not null,     -- encrypted before insert
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  unique(user_id, service)
);

create table oauth_pending (
  state text primary key,
  user_id uuid references auth.users(id) not null,
  code_verifier text not null,
  created_at timestamptz default now()
);
```

`oauth_pending` needs a cleanup cron — delete rows older than 10 minutes.

Encrypt `access_token` / `refresh_token` before they hit the table (Supabase Vault or `pgcrypto`). Plaintext OAuth tokens in a DB is the most common way these systems get breached.

---

## Phase 2 — One-time app registration

Register your app with Upwork's MCP server via Dynamic Client Registration. **Do this once**, not per user. Store the returned `client_id` in your env vars.

```bash
npm install @modelcontextprotocol/sdk
```

Use the SDK's OAuth helpers instead of hand-writing PKCE/DCR.

---

## Phase 3 — "Connect to Upwork" button → start route

`POST /api/upwork/connect`

```js
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);
const state = crypto.randomUUID();

await db.insert('oauth_pending', {
  state, user_id: req.session.userId, code_verifier: codeVerifier
});

const authUrl = buildUpworkAuthUrl({ client_id, code_challenge: codeChallenge, state });
res.redirect(authUrl);
```

---

## Phase 4 — Callback route

`GET /api/upwork/callback`

```js
const { code, state } = req.query;
const pending = await db.get('oauth_pending', { state });
if (!pending) return res.status(400).send('Invalid or expired session');

const tokens = await exchangeCodeForToken({ code, code_verifier: pending.code_verifier });

await db.upsert('connected_accounts', {
  user_id: pending.user_id,
  service: 'upwork',
  access_token: encrypt(tokens.access_token),
  refresh_token: encrypt(tokens.refresh_token),
  expires_at: new Date(Date.now() + tokens.expires_in * 1000),
});

await db.delete('oauth_pending', { state });
res.redirect('/dashboard?connected=upwork');
```

---

## Phase 5 — Token retrieval + refresh (runs before every use)

```js
async function getValidUpworkToken(userId) {
  const row = await db.get('connected_accounts', { user_id: userId, service: 'upwork' });
  if (!row) throw new Error('Not connected');

  if (row.expires_at > Date.now() + 60_000) return decrypt(row.access_token);

  const refreshed = await refreshUpworkToken(decrypt(row.refresh_token));
  await db.update('connected_accounts', { user_id: userId, service: 'upwork' }, {
    access_token: encrypt(refreshed.access_token),
    refresh_token: encrypt(refreshed.refresh_token), // MUST overwrite — Upwork rotates it
    expires_at: new Date(Date.now() + refreshed.expires_in * 1000),
  });
  return refreshed.access_token;
}
```

Skip overwriting the refresh token and users get silently disconnected within days — this is the #1 support ticket you'll get if you miss it.

---

## Phase 6 — The actual MCP client (provider-agnostic — works with your own AI)

This is the part that changes since you're not routing through Anthropic's API. You build a real MCP client using the official SDK, call Upwork's tools directly, and hand the results to your own AI.

```js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Open short-lived connection, do the work, close. Don't keep this alive per idle user.
async function callUpworkTool(userId, toolName, toolArgs) {
  const accessToken = await getValidUpworkToken(userId);

  const transport = new StreamableHTTPClientTransport(
    new URL("https://mcp.upwork.com/mcp"),
    { requestInit: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const client = new Client({ name: "your-app", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);

  const result = await client.callTool({ name: toolName, arguments: toolArgs });

  await client.close();
  return result;
}
```

**Bridging to your own AI:**

1. Fetch the tool list once (`client.listTools()`), cache it — the tool schema is identical for every user, it's the same server. No need to refetch per request.
2. Feed that tool list into your AI's function-calling / tool-use format, whatever your AI supports.
3. User sends a message → your AI decides which tool to call and with what arguments.
4. You execute it: `await callUpworkTool(userId, chosenTool.name, chosenTool.arguments)`.
5. Feed the result back into your AI to generate the reply shown to the user.

Your AI never touches the token. It only ever sees tool names, arguments, and results — the token stays entirely in your backend's `callUpworkTool` function. That's the correct security boundary: keep credentials out of anything that goes near a prompt.

---

## Phase 7 — Rate limiting per user

```js
const limiter = new RateLimiterRedis({ storeClient: redis, points: 20, duration: 60 });
await limiter.consume(userId); // throws if this specific user exceeds their own quota
```

Key by `userId`, never globally. One user's heavy usage should never throttle another user on a completely different Upwork account.

---

## Phase 8 — Disconnect

```
DELETE /api/upwork/disconnect
→ call Upwork's revoke endpoint with the token, if exposed
→ delete the row from connected_accounts
```

---

## Why this scales to many concurrent users

- No server-side session state tied to a user — every request re-fetches from the DB, so any server instance can serve any user. Plain load balancer, no sticky sessions needed.
- MCP connections are opened per request and closed immediately — you're never holding thousands of idle sockets open for connected-but-inactive users.
- Rate limiting is per-user in Redis, not per-process.
- `oauth_pending` lives in DB/Redis, not memory, so the OAuth redirect round-trip survives landing on a different server instance than the one that started it.

## Security checklist

- Encrypt tokens at rest. Non-negotiable.
- Log every write action (proposal sent, message sent) with `user_id` + timestamp. Upwork grants full-scope access per connection — if something misfires, you need to know exactly whose account and what fired.
- Never let your AI auto-fire write actions without a visible confirm click in your UI, even though Upwork also gates binding actions on their end.

## Before you build the scaling layer

Get one real user working end to end first — connect, one working tool call, disconnect — before adding Redis rate limiting, encryption, and cleanup crons. Confirm the actual value loop works before industrializing it for users you don't have yet.
