import { chatCompletionWithRetry, friendlyLlmError, parseLlmJson } from "@/lib/llm";
import { logLlmUsage } from "@/lib/llm-logger";
import { buildMcpTools, type McpAgentContext, type McpToolDefinition } from "./mcp-tools";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type RawAssistantMessage = {
  role: "assistant";
  content?: string | null;
  tool_calls?: ToolCall[];
};

type RawToolMessage = {
  role: "tool";
  tool_call_id: string;
  content: string;
};

type SaveProposalCb = (fullContent: string) => Promise<boolean>;

export interface RunMcpChatParams {
  systemPrompt: string;
  messages: ChatMessage[];
  /** When provided, the chat runs as a tool-calling agent over the Upwork MCP. */
  mcp?: McpAgentContext;
  maxToolIterations?: number;
  /** Optional callback to persist a proposal draft produced by the models. */
  onProposalDraft?: SaveProposalCb;
}

interface ChatResponseShape {
  choices?: Array<{
    message?: RawAssistantMessage;
    finish_reason?: string;
  }>;
}

/**
 * Run a chat that may call Upwork MCP tools.
 *
 * Loop:
 *  1. POST to the LLM (non-streaming) with `tools` + messages.
 *  2. If the model returns `tool_calls`, execute each against the MCP (or a
 *     blocked/error result), append the `tool` results, and loop.
 *  3. Once the model returns a plain text answer (no tool_calls), stream that
 *     content back to the client as SSE `content` events.
 *
 * A max-iteration guard prevents a runaway tool loop. If no MCP context is
 * provided, it behaves as a plain (non-tool) chat.
 */
export async function runMcpChat(params: RunMcpChatParams): Promise<Response> {
  const tools: McpToolDefinition[] = [];
  let runTool: ((name: string, args: Record<string, unknown>, ctx: McpAgentContext) => Promise<{ ok: boolean; text?: string; error?: string }>) | undefined;
  if (params.mcp) {
    const built = buildMcpTools({
      include: params.mcp.toolIncludes,
      maxResultChars: params.mcp.maxResultChars,
    });
    tools.push(...built.def);
    runTool = built.run;
  }
  const maxIterations = params.maxToolIterations ?? 6;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let fullContent = "";
      let startTime = Date.now();
      let finalProvider: { name: string; model: string } | null = null;

      try {
        // Build the working message list. Tool results are appended to this
        // across iterations so the model sees prior tool outputs.
        const working: unknown[] = [
          { role: "system", content: params.systemPrompt },
          ...params.messages.map((m) => ({ role: m.role, content: m.content.slice(0, 3000) })),
        ];

        for (let iter = 0; iter <= maxIterations; iter++) {
          const { response, provider } = await chatCompletionWithRetry(() => ({
            model: "openai/gpt-oss-20b",
            messages: working as never[],
            ...(tools.length ? { tools: tools as never[], tool_choice: "auto" as const } : {}),
            stream: false,
            temperature: 0.7,
            max_tokens: 1500,
          }));

          finalProvider = { name: provider.name, model: provider.model };
          if (iter === 0) startTime = Date.now();

          const text = await response.text();
          const parsed = parseLlmJson<ChatResponseShape>(text);
          const choice = parsed.choices?.[0];
          const message: RawAssistantMessage | undefined = choice?.message;

          // Collect assistant content (may be spread across tool iterations).
          if (message?.content) fullContent += message.content;

          const calls: ToolCall[] = Array.isArray(message?.tool_calls) ? message.tool_calls : [];

          // No tools requested → return the accumulated content.
          if (calls.length === 0 || !runTool) {
            if (fullContent.trim()) {
              sendContentInChunks(send, fullContent);
            } else {
              send({ content: fullContent || "" });
            }
            break;
          }

          // Check iteration budget.
          if (iter >= maxIterations) {
            const msg =
              fullContent.trim() ||
              "The assistant hit the tool-call limit. Here is what it found before stopping. Ask again if you need more."
            sendContentInChunks(send, msg);
            break;
          }

          // Execute the requested tools.
          const toolResults: RawToolMessage[] = [];
          for (const call of calls) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
            } catch {
              args = {};
            }
            const result = await runTool(call.function.name, args, params.mcp!);
            toolResults.push({
              role: "tool",
              tool_call_id: call.id,
              content: result.ok && result.text ? result.text : result.error || "(no result)",
            });
          }

          // Append assistant message (with tool_calls) + tool results so the
          // model can continue.
          working.push({ role: "assistant", content: message?.content ?? null, tool_calls: calls });
          working.push(...toolResults);
        }

        // Persist a proposal draft if the model wrote one.
        if (params.onProposalDraft && fullContent.trim().length >= 50) {
          try {
            const saved = await params.onProposalDraft(fullContent.trim());
            if (saved) send({ saved: true });
          } catch {
            // non-fatal
          }
        }

        send({ done: true });
        controller.close();

        if (finalProvider) {
          logLlmUsage({
            provider: finalProvider.name,
            model: finalProvider.model,
            endpoint: "job-chat-tools",
            prompt_tokens: 0,
            completion_tokens: Math.ceil(fullContent.length / 4),
            total_tokens: Math.ceil(fullContent.length / 4),
            duration_ms: Date.now() - startTime,
            success: true,
          }).catch(() => {});
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.warn("[McpChat] error:", msg);
        send({ error: friendlyLlmError(err), code: "error" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function sendContentInChunks(send: (d: unknown) => void, content: string) {
  // 120-char chunks give a natural streaming effect in the chat UI.
  const size = 120;
  for (let i = 0; i < content.length; i += size) {
    send({ content: content.slice(i, i + size) });
  }
}
