"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { registerChatSession, removeChatSession } from "@/lib/chat-sessions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const mdComponents: Components = {
  p: ({ children }) => <p className="my-1 last:mb-0 leading-relaxed">{children}</p>,
  h1: ({ children }) => <h1 className="text-base font-semibold mt-2 mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-[15px] font-semibold mt-2 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>,
  ul: ({ children }) => <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 my-1 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-[#00C98B] underline underline-offset-2 break-all">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[12.5px] break-all">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="rounded-lg bg-white/10 p-2.5 my-2 overflow-x-auto text-[12.5px] font-mono leading-relaxed">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#00C98B]/40 pl-3 my-1 italic text-white/60">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2 border-white/15" />,
  table: ({ children }) => (
    <div className="my-2 max-w-full overflow-x-auto">
      <table className="border-collapse text-[12.5px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-white/15 px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-white/15 px-2 py-1">{children}</td>
  ),
};

const DEFAULT_MESSAGES = [
  "Price gigs and set rates that win work",
  "Write proposals that get client replies",
  "Find the right Upwork jobs faster",
  "Learn what every UpScore feature does",
];

const AI_DISCLAIMER =
  "AI can make mistakes. Please verify important information.";

interface CopilotChatProps {
  apiEndpoint: string;
  storageKey: string;
  sessionId: string;
  contextKey: string;
  sessionKind: "profile" | "job";
  sessionTitle: string;
  showSaveToast?: boolean;
  onClose?: () => void;
  className?: string;
}

export function CopilotChat({
  apiEndpoint,
  storageKey,
  sessionId,
  contextKey,
  sessionKind,
  sessionTitle,
  showSaveToast = false,
  onClose,
  className,
}: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore corrupted storage
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
    if (messages.length > 0) {
      registerChatSession({
        id: sessionId,
        kind: sessionKind,
        title: sessionTitle,
        contextKey,
      });
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // storage full or unavailable
    }
  }, [messages, storageKey, sessionId, sessionKind, sessionTitle, contextKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const history = messagesRef.current;
      const next: Message[] = [...history, { role: "user", content: trimmed }];
      setMessages([...next, { role: "assistant", content: "" }]);
      setInput("");
      setStreaming(true);
      setError(null);

      try {
        const res = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            if (!event.startsWith("data: ")) continue;
            const json = event.slice(6).trim();
            if (!json) continue;
            try {
              const data = JSON.parse(json);
              if (data.content) {
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (!last || last.role !== "assistant") return prev;
                  const copy = [...prev];
                  copy[copy.length - 1] = { ...last, content: last.content + data.content };
                  return copy;
                });
              }
              if (showSaveToast && data.saved) {
                toast.success("Proposal saved to your Proposals page");
              }
              if (data.error) throw new Error(data.error);
            } catch (err: unknown) {
              if (err instanceof Error) throw err;
            }
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant" && !last.content) {
            copy[copy.length - 1] = { ...last, content: "Sorry, something went wrong. Please try again." };
          }
          return copy;
        });
      } finally {
        setStreaming(false);
        inputRef.current?.focus();
      }
    },
    [apiEndpoint, streaming, showSaveToast]
  );

  const handleClear = useCallback(() => {
    if (!confirm("Clear this chat history?")) return;
    setMessages([]);
    setError(null);
    removeChatSession(sessionId);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [sessionId, storageKey]);

  return (
    <div className={cn("flex h-full flex-col overflow-hidden bg-[#0A0A0A]", className)}>
      {/* Header */}
      <div className="relative flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#0A0A0A] px-4 py-4">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 size-32 rounded-full bg-[#00C98B]/15 blur-3xl" />

        <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#00C98B]/25 bg-[#00C98B]/10 text-[#00C98B]">
          <Sparkles className="size-4" />
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-heading text-sm font-bold text-white">
              UpScore Copilot
            </p>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#00C98B]/20 bg-[#00C98B]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#00C98B]">
              <span className="size-1 rounded-full bg-[#00C98B]" />
              AI
            </span>
          </div>
          <p className="mt-0.5 truncate text-[10px] text-white/45">
            Your freelancing sidekick, right here on every page.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          title="Clear chat"
          aria-label="Clear chat"
          disabled={messages.length === 0}
          className="relative size-8 shrink-0 rounded-lg text-white/45 hover:bg-white/10 hover:text-[#00C98B]"
        >
          <Trash2 className="size-3.5" />
        </Button>

        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Close chat"
            aria-label="Close chat"
            className="relative size-8 shrink-0 rounded-lg text-white/45 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="min-h-0 flex-1 bg-[#0A0A0A]">
        <div ref={scrollRef} className="space-y-4 p-4">
          {messages.length === 0 && (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-3 py-8 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 size-full rounded-2xl bg-[#00C98B]/25 blur-xl" />
                <div className="relative flex size-12 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#00C98B] ring-1 ring-[#00C98B]/30 shadow-lg">
                  <MessageSquare className="size-5" />
                </div>
              </div>
              <p className="font-heading text-sm font-bold text-white">
                Ask anything about your Upwork game
              </p>
              <p className="mx-auto mt-2 max-w-[280px] text-[11px] leading-relaxed text-white/45">
                Your profile, the market, job fit, proposals — pick a starting
                point or type your own question.
              </p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div key={i} className={`flex min-w-0 ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] min-w-0 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words ${
                    isUser
                      ? "bg-[#00C98B] text-[#0A0A0A] rounded-br-md"
                      : "bg-white/5 text-white/90 ring-1 ring-white/10 rounded-bl-md"
                  }`}
                >
                  {isUser ? (
                    <span className="whitespace-pre-wrap font-medium">{msg.content}</span>
                  ) : (
                    <div className="chat-md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                        {msg.content || (streaming && i === messages.length - 1 ? "…" : "")}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#00C98B]" />
              <p className="text-[11px] leading-relaxed text-white/55">{error}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Default messages */}
      <div className="shrink-0 border-t border-white/10 bg-[#0A0A0A] px-3 py-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DEFAULT_MESSAGES.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={streaming}
              onClick={() => sendMessage(prompt)}
              className="inline-flex min-h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#00C98B]/20 bg-[#00C98B]/10 px-2.5 text-[10px] font-medium text-[#00C98B] transition-all hover:bg-[#00C98B]/20 hover:text-white disabled:pointer-events-none disabled:opacity-40"
            >
              <Sparkles className="size-3" />
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <div className="shrink-0 border-t border-white/10 bg-[#0A0A0A] p-3">
        <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 p-1.5 transition-colors focus-within:border-[#00C98B]/50 focus-within:ring-2 focus-within:ring-[#00C98B]/10">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="What can UpScore do?"
            rows={2}
            className="min-h-10 max-h-28 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-relaxed text-white outline-none placeholder:text-white/30"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={streaming || !input.trim()}
            aria-label="Send message"
            className="size-9 shrink-0 rounded-lg bg-[#00C98B] text-[#0A0A0A] hover:bg-[#00C98B]/90"
          >
            {streaming ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[9px] text-white/35">
          {AI_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}