"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Send,
  Loader2,
  Trash2,
  Sparkles,
  AlertTriangle,
  Briefcase,
  FileText,
  X,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_PREFIX = "upscore-job-chat-";

const mdComponents: Components = {
  p: ({ children }) => <p className="my-1 last:mb-0">{children}</p>,
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
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-accent-blue underline underline-offset-2 break-all">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-black/10 dark:bg-white/10 px-1 py-0.5 font-mono text-[12.5px] break-all">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="rounded-lg bg-black/10 dark:bg-white/10 p-2.5 my-2 overflow-x-auto text-[12.5px] font-mono leading-relaxed">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-muted-foreground/30 pl-3 my-1 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2 border-muted-foreground/20" />,
  table: ({ children }) => (
    <div className="my-2 max-w-full overflow-x-auto">
      <table className="border-collapse text-[12.5px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-black/5 dark:bg-white/5">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-muted-foreground/25 px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-muted-foreground/25 px-2 py-1">{children}</td>,
};

const QUICK_ACTIONS: { label: string; icon: typeof Sparkles; prompt: string }[] = [
  {
    label: "Summarize",
    icon: FileText,
    prompt:
      "Give me a 5-bullet summary of this job and what the client actually needs.",
  },
  {
    label: "Draft proposal",
    icon: Sparkles,
    prompt:
      "Write a proposal for this job using the proposal methodology and my profile.",
  },
  {
    label: "Should I apply?",
    icon: Briefcase,
    prompt:
      "Based on the job and the AI analysis, should I apply? What's my best angle?",
  },
  {
    label: "Red flags?",
    icon: AlertTriangle,
    prompt:
      "What risks or red flags should I watch out for with this job or client?",
  },
];

export function JobChat({
  jobId,
  jobTitle,
  className,
  onClose,
}: {
  jobId: string;
  jobTitle: string;
  className?: string;
  onClose?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + jobId);
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
      localStorage.setItem(STORAGE_PREFIX + jobId, JSON.stringify(messages));
    } catch {
      // storage full or unavailable
    }
  }, [messages, jobId]);

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
        const res = await fetch(`/api/jobs/${jobId}/chat`, {
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
              if (data.saved) {
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
    [jobId, streaming]
  );

  const handleClear = useCallback(() => {
    if (!confirm("Clear this job's chat history?")) return;
    setMessages([]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_PREFIX + jobId);
    } catch {
      // ignore
    }
  }, [jobId]);

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card shadow-sm flex flex-col overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border/40">
        <div className="rounded-lg bg-accent-blue/10 p-1.5">
          <MessageSquare className="size-4 text-accent-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold font-heading leading-tight truncate">
            Job Assistant
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{jobTitle}</p>
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
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            onClick={onClose}
            title="Close chat"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="rounded-xl bg-accent-purple/10 p-3 w-fit mx-auto mb-3">
                <Sparkles className="size-6 text-accent-purple" />
              </div>
              <p className="text-sm font-medium">Chat about this job</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto leading-relaxed">
                Ask about the client, whether to apply, or draft a proposal — it&apos;s
                saved to your Proposals page.
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
                      ? "bg-accent-blue text-white rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {isUser ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
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
            placeholder="Ask about this job…"
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
          Chat history is saved in this browser for this job.
        </p>
      </div>
    </div>
  );
}
