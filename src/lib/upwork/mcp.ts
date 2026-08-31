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

/** Extract the text content payload of an MCP tool result (`result.content[].text`). */
export function extractMcpText(result: unknown): string | null {
  if (!result) return null;
  const r = result as { result?: { content?: Array<{ type: string; text?: string }> } };
  const item = r?.result?.content?.find((c) => c.type === "text");
  return item?.text ?? null;
}

/**
 * Fetch the freelancer's own live Upwork profile via the MCP
 * `upwork__get_profile` tool. Returns the parsed JSON object (e.g.
 * `{ status, data: { personalData, skills, profileAggregates, ... } }`)
 * or null on any failure.
 */
export async function getProfile(
  accessToken: string,
  url: string,
  orgUid: string
): Promise<{
  status: string;
  data?: Record<string, unknown>;
  portfolioProjects?: Array<{ id: string; title: string }>;
  [k: string]: unknown;
} | null> {
  try {
    const [profileRes, highlightsRes] = await Promise.allSettled([
      callMcp(accessToken, url, "tool", {
        toolName: "upwork__get_profile",
        arguments: { action: "get", org_uid: orgUid },
      }),
      callMcp(accessToken, url, "tool", {
        toolName: "upwork__get_profile",
        arguments: { action: "list_highlights", org_uid: orgUid },
      }),
    ]);

    if (profileRes.status !== "fulfilled") return null;
    const text = extractMcpText(profileRes.value);
    if (!text) return null;
    const parsed = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) return null;

    // Attach portfolio projects (id + title) from list_highlights, if available.
    let portfolioProjects: Array<{ id: string; title: string }> | undefined;
    if (highlightsRes.status === "fulfilled") {
      const hlText = extractMcpText(highlightsRes.value);
      if (hlText) {
        try {
          const hl = JSON.parse(hlText);
          const items = Array.isArray(hl?.portfolio_projects)
            ? hl.portfolio_projects.map((pp: any) => ({
                id: String(pp?.id ?? ""),
                title: String(pp?.title ?? ""),
              }))
            : [];
          if (items.length) portfolioProjects = items;
        } catch {
          // ignore malformed highlights
        }
      }
    }

    return {
      ...(parsed as Record<string, unknown>),
      ...(portfolioProjects ? { portfolioProjects } : {}),
    } as {
      status: string;
      data?: Record<string, unknown>;
      portfolioProjects?: Array<{ id: string; title: string }>;
    };
  } catch (e) {
    console.warn("upwork get_profile MCP failed", e);
    return null;
  }
}

/**
 * Normalize the MCP `upwork__get_profile` payload into the same shape used by
 * profile audits (`title`, `hourly_rate`, `total_earnings`, `total_jobs_done`,
 * `client_rating`, `skills`, `bio`, `portfolio`, `upwork_url`). Returns the
 * normalized record or null if the payload is unusable.
 */
export function normalizeMcpProfile(
  p: {
    status: string;
    data?: Record<string, any>;
    portfolioProjects?: Array<{ id: string; title: string }>;
    languages?: Array<Record<string, unknown>>;
  } | null
): Record<string, unknown> | null {
  if (!p || p.status !== "ok" || !p.data) return null;
  const d: any = p.data;
  const personal = d?.personalData ?? {};
  const aggregates = d?.profileAggregates ?? {};
  const availability = d?.availability ?? {};
  const personAvailability = d?.personAvailability ?? {};
  const location = personal?.location ?? {};
  const stripTags = (v: string): string =>
    v.replace(/<\/?untrusted_participant_content>/g, "").replace(/<[^>]+>/g, "").trim();
  const cleanName = (v: unknown): string | null => {
    if (typeof v !== "string" || !v.trim()) return null;
    return stripTags(v);
  };
  const skills = Array.isArray(d?.skills)
    ? d.skills
        .map((s: any) => cleanName(s?.prettyName ?? s?.skill))
        .filter((s: unknown): s is string => !!s)
    : null;
  const charge = personal?.chargeRate ?? {};
  const rating = personal?.profilesStats?.jobSuccessScore
    ? Number(personal.profilesStats.jobSuccessScore) / 20
    : null;
  const cleanText = (v: unknown): string | null => {
    if (typeof v !== "string" || !v) return null;
    return stripTags(v);
  };
  const cleanList = (v: unknown): Array<Record<string, unknown>> | null => {
    if (!Array.isArray(v) || v.length === 0) return null;
    return v
      .map((item: any) => {
        const out: Record<string, unknown> = {};
        if (item && typeof item === "object") {
          for (const [k, val] of Object.entries(item)) {
            if (typeof val === "string") out[k] = stripTags(val);
            else if (val != null) out[k] = val;
          }
        }
        return out;
      })
      .filter((o) => Object.keys(o).length > 0);
  };
  const langSource: any[] =
    (Array.isArray((p as any)?.languages) && (p as any).languages) ||
    (Array.isArray(d?.languages) && d.languages) ||
    [];
  const languages = langSource.length
    ? langSource
        .map((l: any) => ({
          name: cleanName(l?.language_name),
          proficiency: l?.proficiency_label || l?.proficiency || null,
        }))
        .filter((l: any) => l.name)
    : null;
  const firstName = cleanText(personal?.firstName);
  const lastName = cleanText(personal?.lastName);
  const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName;
  const city = cleanText(location?.city);
  const country = cleanText(location?.country);
  const timezone = cleanText(location?.timezone);
  const locationStr =
    [city, country]
      .filter((v): v is string => !!v)
      .join(", ") || null;
  return {
    name,
    title: cleanText(personal?.title),
    bio: cleanText(personal?.description),
    hourly_rate: charge?.rawValue != null ? Number(charge.rawValue) : null,
    total_earnings: aggregates?.totalEarnings != null ? Number(aggregates.totalEarnings) : null,
    total_jobs_done:
      aggregates?.totalFixedJobs != null || aggregates?.totalHourlyJobs != null
        ? Number(aggregates.totalFixedJobs ?? 0) + Number(aggregates.totalHourlyJobs ?? 0)
        : null,
    client_rating: rating,
    skills,
    upwork_url: personal?.profileUrl || null,
    location: locationStr,
    country,
    city,
    timezone,
    availability:
      cleanText(availability?.hours_per_week) ||
      (personAvailability?.capacity === "fullTime"
        ? "Full time"
        : personAvailability?.capacity
          ? String(personAvailability.capacity)
          : null),
    languages,
    education: cleanList(d?.educationRecords),
    employment: cleanList(d?.employmentRecords),
    portfolio: Array.isArray(p.portfolioProjects)
      ? p.portfolioProjects.map((pp) => ({ title: pp.title }))
      : null,
  };
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
