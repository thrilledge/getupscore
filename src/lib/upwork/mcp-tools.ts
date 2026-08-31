import { callMcp, extractMcpText } from "./mcp";

/**
 * Tool-calling (function-calling) support for the Upwork MCP inside the job
 * chat. We expose a set of Upwork MCP tools to the LLM in OpenAI function
 * format, execute the requested `tool_calls` against the MCP endpoint, and
 * feed the results back so the model can analyze jobs, fetch live client data,
 * inspect the freelancer's own proposals, and (in non-testing mode) prepare a
 * real proposal for submission.
 */

export interface McpAgentContext {
  accessToken: string;
  url: string;
  orgUid: string;
  /** When true, mutating/side-effect tools (e.g. proposal submission) are
   *  refused. Used during local testing so no real Upwork action happens. */
  isTesting: boolean;
  /** Optional: only register these tool names (subset) to save prompt tokens. */
  toolIncludes?: string[];
  /** Optional: cap tool result chars fed back to the model. */
  maxResultChars?: number;
  /** Optional: the title of the job being proposed — used as a search query to
   *  pre-validate that the job is still a live, open Upwork posting before
   *  spending Connects on a submission. */
  jobSearchQuery?: string;
}

export interface McpToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface ToolResult {
  ok: boolean;
  text?: string;
  error?: string;
}

type Executor = (args: Record<string, unknown>, ctx: McpAgentContext) => Promise<ToolResult>;

function tool(
  name: string,
  description: string,
  parameters: Record<string, unknown>,
  executor: Executor
): { def: McpToolDefinition; run: Executor } {
  return {
    def: { type: "function", function: { name, description, parameters } },
    run: executor,
  };
}

async function mcpCall(
  ctx: McpAgentContext,
  toolName: string,
  args: Record<string, unknown>,
  maxResultChars = 4000
): Promise<ToolResult> {
  try {
    const result = await callMcp(ctx.accessToken, ctx.url, "tool", {
      toolName,
      arguments: {
        org_uid: ctx.orgUid,
        ...args,
      },
    });

    // A JSON-RPC error (e.g. invalid args, permission) is NOT a success — it's
    // in the `error` field, not `result.content`. Surfacing it as ok:true used
    // to make the chat believe a real submission happened when Upwork actually
    // rejected it.
    const jsonError = extractMcpError(result);
    if (jsonError) return { ok: false, error: jsonError };

    let text = extractMcpText(result);
    if (!text) return { ok: true, text: "(no text content returned)" };

    // Some MCP servers signal failure via `isError` on the result envelope.
    const isErrorResult =
      (result as { result?: { isError?: unknown } })?.result?.isError === true;
    if (isErrorResult) return { ok: false, error: text };

    if (text.length > maxResultChars) {
      text = text.slice(0, maxResultChars) + "\n…[result truncated — ask for a narrower query if you need more]";
    }
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Detect a JSON-RPC error in an MCP response envelope. */
function extractMcpError(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const r = result as { error?: { message?: string; code?: unknown } };
  if (!r.error) return null;
  const msg =
    (typeof r.error.message === "string" && r.error.message) ||
    `MCP error (code ${r.error.code ?? "unknown"})`;
  return msg.replace(/\n/g, " ");
}

type Liveness = "live" | "stale" | "unknown";

/**
 * Best-effort check that a job reference is still a live, open Upwork posting
 * before we spend Connects submitting to it. Vibeworker scrapes jobs that can
 * expire or get filled — a freshly-indexed but long-dead job id will never be
 * accepted by Upwork, so catching it up-front saves Connects and prevents a
 * confusing "submitted but not on Upwork" state.
 *
 * We search the marketplace for the job's own title and see if the reference
 * id appears among the results (up to a couple of pages). `find_jobs get` can't
 * be used here — it returns "id is required" for freelancer accounts.
 *
 * Result: 'live' if the id is found, 'stale' only if we positively confirm it's
 * absent, 'unknown' if pagination/search couldn't settle it (never blocks).
 */
async function checkJobLiveness(
  ctx: McpAgentContext,
  jobReference: string,
  query: string
): Promise<Liveness> {
  const needle = String(jobReference);
  const seen = new Set<string>();
  // Try up to 2 pages of results.
  for (let page = 1; page <= 2; page++) {
    const res = await mcpCall(ctx, "upwork__find_jobs", {
      action: "search",
      query: query || needle,
      limit: 10,
      page,
    }, 12000);
    if (!res.ok || !res.text) return "unknown";
    const ids = extractJobIds(res.text);
    if (!ids) return "unknown";
    for (const id of ids) seen.add(id);
    if (ids.includes(needle)) return "live";
    // If this page was clearly the end, stop.
    if (seen.size < 10) break;
  }
  // If we never saw it across the pages we pulled, treat it as stale.
  return "stale";
}

/** Pull numeric job ids out of a find_jobs search result payload. */
function extractJobIds(text: string): string[] | null {
  try {
    const parsed = JSON.parse(text);
    const jobs = Array.isArray(parsed?.jobs) ? parsed.jobs : [];
    return jobs
      .map((j: { id?: unknown }) => (typeof j?.id === "string" ? j.id : String(j?.id ?? "")))
      .filter(Boolean);
  } catch {
    return null;
  }
}

export function buildMcpTools(options?: {
  /** Only register these tool names (subset). Reduces prompt tokens on the on-demand Groq tier. */
  include?: string[];
  /** Cap on how many chars of a tool result are fed back to the model. */
  maxResultChars?: number;
}): { def: McpToolDefinition[]; run: (name: string, args: Record<string, unknown>, ctx: McpAgentContext) => Promise<ToolResult> } {
  const maxResultChars = options?.maxResultChars ?? 4000;
  const include = options?.include ? new Set(options.include) : null;
  const tools = [
    tool(
      "upwork_find_jobs",
      "Search the Upwork marketplace for jobs or get full details of a single job posting. Actions: search (query, job_type, experience_level, budget, etc.), get (pass an id / job_id / full Upwork job URL), smart_search (auto-match your profile skills to jobs). Returns job listings with client information.",
      {
        type: "object",
        properties: {
          action: { type: "string", enum: ["search", "get", "smart_search"], description: "Which action to run" },
          query: { type: "string", description: "Search phrase for action=search" },
          id: { type: "string", description: "Job id, ~02 ciphertext, or full Upwork URL for action=get" },
          job_type: { type: "string", enum: ["fixed", "hourly"], description: "For action=search (optional)" },
          experience_level: { type: "string", enum: ["entry_level", "intermediate", "expert"], description: "For action=search (optional)" },
          limit: { type: "integer", description: "Max results (1-10) for action=search (optional)" },
        },
        required: ["action"],
      },
      (args, ctx) => mcpCall(ctx, "upwork__find_jobs", args, maxResultChars)
    ),

    tool(
      "upwork_get_freelancer_financials",
      "View your own Upwork financial data: connects balance (action=connects_balance), earnings summary (action=summary), transaction history (action=transactions), or timesheets (action=timesheets).",
      {
        type: "object",
        properties: {
          action: { type: "string", enum: ["connects_balance", "summary", "transactions", "timesheets"], description: "Which action to run" },
          from_date: { type: "string", description: "yyyy-mm-dd for summary/transactions (optional)" },
          to_date: { type: "string", description: "yyyy-mm-dd for summary/transactions (optional)" },
          limit: { type: "integer", description: "Max results (optional)" },
        },
        required: ["action"],
      },
      (args, ctx) => mcpCall(ctx, "upwork__get_freelancer_financials", args, maxResultChars)
    ),

    tool(
      "upwork_get_profile",
      "Get the freelancer's own live Upwork profile. Actions: get (title, bio, skills, rate, education, employment, languages, location) or list_highlights (portfolio projects and certificates: only id + title).",
      {
        type: "object",
        properties: {
          action: { type: "string", enum: ["get", "list_highlights"], description: "Which action to run" },
        },
        required: ["action"],
      },
      (args, ctx) => mcpCall(ctx, "upwork__get_profile", args, maxResultChars)
    ),

    tool(
      "upwork_list_freelancer_proposals",
      "List the freelancer's own proposals and invitations. Actions: list (own proposals, status filter), invitations (received client invitations), get (full detail of one proposal), get_room (messaging room for a proposal).",
      {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "invitations", "get", "get_room"], description: "Which action to run" },
          status: { type: "string", description: "Proposal status filter for action=list (default 'Accepted' = submitted)" },
          id: { type: "string", description: "Proposal id for action=get / get_room" },
          limit: { type: "integer", description: "Max results (optional)" },
        },
        required: ["action"],
      },
      (args, ctx) => mcpCall(ctx, "upwork__list_freelancer_proposals", args, maxResultChars)
    ),

    tool(
      "upwork_list_messages_rooms",
      "List the freelancer's messaging rooms (action=list_rooms) or find a room by context (action=find_room).",
      {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list_rooms", "find_room"], description: "Which action to run" },
          unread_only: { type: "boolean", description: "For action=list_rooms (optional)" },
          limit: { type: "integer", description: "For action=list_rooms (optional)" },
        },
        required: ["action"],
      },
      (args, ctx) => mcpCall(ctx, "upwork__get_messages", args, maxResultChars)
    ),

    tool(
      "upwork_list_contracts",
      "Search the freelancer's contracts and offers. Action: search. Returns contract details, milestones, and client info.",
      {
        type: "object",
        properties: {
          action: { type: "string", enum: ["search"], description: "Which action to run (default search)" },
          contract_statuses: { type: "array", items: { type: "string" }, description: "Filter: ACTIVE, CLOSED, PAUSED (optional)" },
          limit: { type: "integer", description: "Max results (optional)" },
        },
        required: ["action"],
      },
      (args, ctx) => mcpCall(ctx, "upwork__list_contracts", args, maxResultChars)
    ),

    tool(
      "upwork_manage_proposals",
      "PREPARE a proposal for an Upwork job (does NOT submit — returns a preview draft). Actions: create (prepare a proposal for a marketplace job; requires job_reference, cover_letter, charged_amount), accept_invitation (respond to a client invitation), decline_invitation, withdraw. IMPORTANT: In testing mode this tool is READ-ONLY and will refuse to prepare/submit a real proposal. Always check the preview's connects_cost and connects_balance before proceeding.",
      {
        type: "object",
        properties: {
          action: { type: "string", enum: ["create", "accept_invitation", "decline_invitation", "withdraw"], description: "Which action to run" },
          job_reference: { type: "string", description: "Numeric jobs[].id for action=create" },
          cover_letter: { type: "string", description: "Proposal cover letter (max 5000 chars) for action=create" },
          charged_amount: { type: "number", description: "Bid amount (number, not string) for action=create" },
          invitation_uid: { type: "string", description: "Invitation uid for action=accept_invitation" },
          proposal_id: { type: "string", description: "Proposal id for action=withdraw" },
        },
        required: ["action"],
      },
      async (args, ctx) => {
        if (ctx.isTesting) {
          return {
            ok: false,
            error: "TESTING MODE: proposal submission is disabled. This tool is read-only right now so no real Upwork action (and no Connects spend) can happen. You may still advise the user on the draft, bid, and angle, but you cannot prepare/submit a proposal via MCP until submission is enabled.",
          };
        }

        // Before spending Connects on a real submission, verify the job is
        // still a live, open Upwork posting. Jobs indexed by Vibeworker can
        // expire / get filled, and Upwork simply rejects submissions to them.
        // Catching that here keeps us honest: we refuse and stay with the local
        // draft instead of reporting a fake `sent`.
        const action = String(args?.action ?? "");
        if (action === "create") {
          const jobReference = String(args?.job_reference ?? "");
          if (!jobReference) {
            return {
              ok: false,
              error: "Cannot submit: no job_reference was provided. This job came from Vibeworker and has no valid Upwork job id — please confirm the job is still live on Upwork (or ask the user for the current Job ID/URL) before submitting.",
            };
          }
          const liveness = await checkJobLiveness(ctx, jobReference, ctx.jobSearchQuery || jobReference);
          if (liveness === "stale") {
            return {
              ok: false,
              error: `This job (Upwork id ${jobReference}) no longer appears as an ACTIVE posting on Upwork. It was likely scraped by Vibeworker earlier and has since expired or been filled, so Upwork will not accept a proposal for it. Refusing to spend Connects. The proposal is saved as a local draft — use a currently-open job to submit.`,
            };
          }
          // 'live' → proceed; 'unknown' → proceed (Upwork's own create result
          // is authoritative and we'll keep it a draft if it rejects anyway).
        }

        return mcpCall(ctx, "upwork__manage_proposals", args, maxResultChars);
      }
    ),
  ];

  const selected = include ? tools.filter((t) => include.has(t.def.function.name)) : tools;
  const defs = selected.map((t) => t.def);
  const byName = new Map(selected.map((t) => [t.def.function.name, t]));

  return {
    def: defs,
    run: async (name, args, ctx) => {
      const t = byName.get(name);
      if (!t) return { ok: false, error: `Unknown tool: ${name}` };
      return t.run(args, ctx);
    },
  };
}
