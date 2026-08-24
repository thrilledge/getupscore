import { chatCompletionWithRetry } from "@/lib/llm";
import { logLlmUsage } from "@/lib/llm-logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SaveProposal = {
  supabase: SupabaseClient<Database>;
  userId: string;
  jobId: string;
};

/**
 * Compresses long chat histories: keeps the most recent messages intact,
 * truncates older ones to ~150 chars each. This avoids an extra LLM call
 * while still significantly reducing token usage for long conversations.
 */
function compressMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= 6) return messages;

  // Keep last 5 messages intact
  const recentCount = 5;
  const recent = messages.slice(-recentCount);
  const old = messages.slice(0, -recentCount);

  const compressed: ChatMessage[] = old.map((m) => ({
    role: m.role,
    content: m.content.length > 150
      ? m.content.slice(0, 150) + "… [compressed]"
      : m.content,
  }));

  return [...compressed, ...recent];
}

/**
 * Streams an SSE chat response from the LLM. Optionally persists a full
 * proposal draft (>= 50 chars) to the `proposals` table and emits a
 * `{ saved: true }` event so the client can confirm.
 */
export async function streamChat(
  systemPrompt: string,
  messages: ChatMessage[],
  saveProposal?: SaveProposal,
  maxTokens = 2000
): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let fullContent = "";
      let tokenEstimate = 0;

      try {
        const startTime = Date.now();
        const { response, provider } = await chatCompletionWithRetry(
          (p) => ({
            model: p.model,
            messages: [
              { role: "system", content: systemPrompt },
              ...compressMessages(messages).map((m) => ({ role: m.role, content: m.content.slice(0, 3000) })),
            ],
            stream: true,
            ...(p.groqStyle ? { reasoning_format: "hidden" as const } : {}),
            temperature: 0.7,
            max_tokens: maxTokens,
          })
        );
        console.log("[Chat] Using provider:", provider.name, "model:", provider.model);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.content) {
                fullContent += delta.content;
                tokenEstimate += Math.ceil(delta.content.length / 4);
                send({ content: delta.content });
              }
            } catch {
              // ignore malformed chunk
            }
          }
        }

        if (saveProposal && fullContent.trim().length >= 50) {
          try {
            const { error: saveError } = await saveProposal.supabase
              .from("proposals")
              .insert({
                user_id: saveProposal.userId,
                job_id: saveProposal.jobId,
                generated_text: fullContent.trim(),
                status: "draft",
              });
            if (!saveError) {
              send({ saved: true });
            }
          } catch (err: unknown) {
            console.warn("[Chat] Could not save proposal:", err);
          }
        }

        send({ done: true });
        controller.close();

        logLlmUsage({
          provider: provider.name,
          model: provider.model,
          endpoint: "chat",
          prompt_tokens: 0,
          completion_tokens: tokenEstimate,
          total_tokens: tokenEstimate,
          duration_ms: Date.now() - startTime,
          success: true,
        }).catch(() => {});
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.warn("[Chat] Streaming error:", message);
        send({ error: message });
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
