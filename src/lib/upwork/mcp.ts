/**
 * Minimal Streamable-HTTP client for the Upwork MCP endpoint
 * (https://mcp.upwork.com/mcp). Used by the app-side (Vercel) client with a
 * per-user access token to call tools like `upwork__list_accounts`,
 * `upwork__get_freelancer_financials` (connects balance) and later
 * `upwork__manage_proposals`.
 */
import { randomUUID } from "node:crypto";

const MCP_VERSION = "2025-03-26";

interface McpRequest {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpToolCallParams {
  toolName: string;
  // Upwork MCP tools are namespaced, e.g. "upwork__get_freelancer_financials".
  // The call payload looks like: { name, arguments: { action, org_uid, params } }
  arguments: Record<string, unknown>;
}

export async function listAccounts(accessToken: string, url: string): Promise<unknown> {
  return callMcp(accessToken, url, "list-accounts");
}

/** Autodiscovery: returns the Upwork user uid + org_uid via list-accounts. */
export async function callMcp(
  accessToken: string,
  url: string,
  method: "list-accounts" | "tool" ,
  tool?: McpToolCallParams
): Promise<unknown> {
  const req: McpRequest = {
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "initialize",
    params: {
      protocolVersion: MCP_VERSION,
      capabilities: {},
      clientInfo: { name: "upscore-app", version: "1.0.0" },
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${accessToken}`,
    "mcp-protocol-version": MCP_VERSION,
  };

  const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(req) });
  const sessionId = resp.headers.get("mcp-session-id") ?? undefined;
  const initBody = await parseResponse(resp);

  // Notify initialized (fire and forget)
  if (sessionId) {
    void fetch(url, {
      method: "POST",
      headers: { ...headers, "mcp-session-id": sessionId },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    }).catch(() => undefined);
  }

  // Build the actual tool-call request
  let callReq: McpRequest;
  if (method === "list-accounts") {
    callReq = {
      jsonrpc: "2.0",
      id: randomUUID(),
      method: "tools/call",
      params: {
        name: "upwork__list_accounts",
        arguments: {},
      },
    };
  } else {
    callReq = {
      jsonrpc: "2.0",
      id: randomUUID(),
      method: "tools/call",
      params: {
        name: tool?.toolName,
        arguments: tool?.arguments ?? {},
      },
    };
  }

  const callResp = await fetch(url, {
    method: "POST",
    headers: { ...headers, ...(sessionId ? { "mcp-session-id": sessionId } : {}) },
    body: JSON.stringify(callReq),
  });
  return parseResponse(callResp);
}

async function parseResponse(resp: Response): Promise<unknown> {
  const text = await resp.text();
  if (!text) return null;
  // SSE frames: split by "data:" lines
  if (resp.headers.get("content-type")?.includes("text/event-stream")) {
    const messages = text
      .split(/\r?\n\r?\n/)
      .map((frame) => {
        const line = frame.split("\n").find((l) => l.startsWith("data:"));
        return line ? line.slice(5).trim() : null;
      })
      .filter(Boolean)
      .map((data) => {
        try {
          return JSON.parse(data as string);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return messages[messages.length - 1];
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
