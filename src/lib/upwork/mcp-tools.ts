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
}

export interface McpToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
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
  return { def: { name, description, parameters }, run: executor };
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
    let text = extractMcpText(result);
    if (!text) return { ok: true, text: "(no text content returned)" };
    if (text.length > maxResultChars) {
      text = text.slice(0, maxResultChars) + "\n…[result truncated — ask for a narrower query if you need more]";
    }
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
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
        return mcpCall(ctx, "upwork__manage_proposals", args, maxResultChars);
      }
    ),
  ];

  const selected = include ? tools.filter((t) => include.has(t.def.name)) : tools;
  const defs = selected.map((t) => t.def);
  const byName = new Map(selected.map((t) => [t.def.name, t]));

  return {
    def: defs,
    run: async (name, args, ctx) => {
      const t = byName.get(name);
      if (!t) return { ok: false, error: `Unknown tool: ${name}` };
      return t.run(args, ctx);
    },
  };
}
