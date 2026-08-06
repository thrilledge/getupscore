"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  Loader2,
  Trash2,
  Sparkles,
  AlertTriangle,
  Star,
  Target,
  Wrench,
  BarChart3,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_PREFIX = "upscore-profile-audit-chat-";

const QUICK_ACTIONS: { label: string; icon: typeof Sparkles; prompt: string }[] = [
  {
    label: "Audit my profile",
    icon: Sparkles,
    prompt:
      "Audit my Upwork profile end to end. Give me a clear scorecard of strengths and weaknesses.",
  },
  {
    label: "Improve my bio",
    icon: Star,
    prompt:
      "Rewrite my bio to be more compelling and conversion-focused. Keep it personal to my profile.",
  },
  {
    label: "Better skills",
    icon: Wrench,
    prompt:
      "Looking at my skills and background, which skills should I add or remove to win more jobs?",
  },
  {
    label: "Best niche",
    icon: Target,
    prompt:
      "What niche or job types is my profile best positioned for? Where should I focus?",
  },
  {
    label: "Market fit",
    icon: BarChart3,
    prompt:
      "Using the current market trends data, how well does my profile fit today's demand? Rank my skills against in-demand skills and tell me what to add or drop, and whether my rate is aligned with the market.",
  },
];

export function ProfileAuditChat({ className }: { className?: string }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX);
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
    try {
      localStorage.setItem(STORAGE_PREFIX, JSON.stringify(messages));
    } catch {
      // storage full or unavailable
    }
  }, [messages]);

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
        const res = await fetch("/api/upwork-profile/chat", {
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
    [streaming]
  );

  const handleClear = useCallback(() => {
    if (!confirm("Clear this chat history?")) return;
    setMessages([]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_PREFIX);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className={`rounded-xl border border-border/60 bg-card shadow-sm flex flex-col overflow-hidden ${className ?? ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border/40">
        <div className="rounded-lg bg-accent-purple/10 p-1.5">
          <MessageSquare className="size-4 text-accent-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold font-heading leading-tight">Profile Auditor</p>
          <p className="text-[10px] text-muted-foreground truncate">
            Ask anything about your Upwork profile
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={handleClear}
          title="Clear chat"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="rounded-xl bg-accent-purple/10 p-3 w-fit mx-auto mb-3">
                <Sparkles className="size-6 text-accent-purple" />
              </div>
              <p className="text-sm font-medium">Audit your profile with AI</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto leading-relaxed">
                Get honest feedback on your bio, skills, and portfolio — backed
                by live market trends data for demand, budgets and pricing.
              </p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isUser
                      ? "bg-accent-blue text-white rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.content || (streaming && i === messages.length - 1 ? "…" : "")}
                </div>
              </div>
            );
          })}

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Quick actions */}
      <div className="px-3 pt-2 pb-1 border-t border-border/40 flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            disabled={streaming}
            onClick={() => sendMessage(action.prompt)}
            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <action.icon className="size-3" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3">
        <div className="flex items-end gap-2">
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
            placeholder="Ask about your profile…"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
          />
          <Button
            size="icon"
            className="size-9 shrink-0"
            onClick={() => sendMessage(input)}
            disabled={streaming || !input.trim()}
          >
            {streaming ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Chat history is saved in this browser only.
        </p>
      </div>
    </div>
  );
}
