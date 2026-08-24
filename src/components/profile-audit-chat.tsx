"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown, {
  type Components,
} from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  BarChart3,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Star,
  Target,
  Trash2,
  Wrench,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_PREFIX =
  "upscore-profile-audit-chat-";

const mdComponents: Components = {
  p: ({ children }) => (
    <p className="my-1 leading-relaxed last:mb-0">
      {children}
    </p>
  ),

  h1: ({ children }) => (
    <h1 className="mb-1 mt-3 text-sm font-bold text-[#0A0A0A]">
      {children}
    </h1>
  ),

  h2: ({ children }) => (
    <h2 className="mb-1 mt-3 text-[13px] font-bold text-[#0A0A0A]">
      {children}
    </h2>
  ),

  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 text-xs font-bold text-[#0A0A0A]">
      {children}
    </h3>
  ),

  h4: ({ children }) => (
    <h4 className="mb-1 mt-2 text-xs font-semibold text-[#0A0A0A]">
      {children}
    </h4>
  ),

  ul: ({ children }) => (
    <ul className="my-1.5 list-disc space-y-1 pl-4">
      {children}
    </ul>
  ),

  ol: ({ children }) => (
    <ol className="my-1.5 list-decimal space-y-1 pl-4">
      {children}
    </ol>
  ),

  li: ({ children }) => (
    <li className="leading-relaxed">
      {children}
    </li>
  ),

  strong: ({ children }) => (
    <strong className="font-bold text-[#0A0A0A]">
      {children}
    </strong>
  ),

  em: ({ children }) => (
    <em className="text-black/65">
      {children}
    </em>
  ),

  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="break-all font-medium text-[#008F64] underline decoration-[#00C98B]/50 underline-offset-2 hover:text-[#00C98B]"
    >
      {children}
    </a>
  ),

  code: ({ children }) => (
    <code className="break-all rounded-md bg-[#0A0A0A] px-1.5 py-0.5 font-mono text-[11px] text-[#00C98B]">
      {children}
    </code>
  ),

  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-xl bg-[#0A0A0A] p-3 font-mono text-[11px] leading-relaxed text-white">
      {children}
    </pre>
  ),

  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[#00C98B] bg-[#00C98B]/5 py-1 pl-3 italic text-black/55">
      {children}
    </blockquote>
  ),

  hr: () => (
    <hr className="my-3 border-black/10" />
  ),

  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-black/10">
      <table className="w-full border-collapse text-[11px]">
        {children}
      </table>
    </div>
  ),

  thead: ({ children }) => (
    <thead className="bg-[#0A0A0A] text-white">
      {children}
    </thead>
  ),

  th: ({ children }) => (
    <th className="border border-white/10 px-2 py-1.5 text-left font-semibold">
      {children}
    </th>
  ),

  td: ({ children }) => (
    <td className="border border-black/10 px-2 py-1.5">
      {children}
    </td>
  ),
};

const QUICK_ACTIONS: {
  label: string;
  icon: typeof Sparkles;
  prompt: string;
}[] = [
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

export function ProfileAuditChat({
  className,
}: {
  className?: string;
}) {
  const [messages, setMessages] = useState<
    Message[]
  >(() => {
    if (typeof window === "undefined") return [];

    try {
      const raw = localStorage.getItem(
        STORAGE_PREFIX
      );

      if (raw) {
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignore corrupted storage
    }

    return [];
  });

  const [input, setInput] = useState("");
  const [streaming, setStreaming] =
    useState(false);

  const [error, setError] = useState<
    string | null
  >(null);

  const messagesRef = useRef<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const inputRef =
    useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesRef.current = messages;

    try {
      localStorage.setItem(
        STORAGE_PREFIX,
        JSON.stringify(messages)
      );
    } catch {
      // Storage full or unavailable
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();

      if (!trimmed || streaming) return;

      const history = messagesRef.current;

      const next: Message[] = [
        ...history,
        {
          role: "user",
          content: trimmed,
        },
      ];

      setMessages([
        ...next,
        {
          role: "assistant",
          content: "",
        },
      ]);

      setInput("");
      setStreaming(true);
      setError(null);

      try {
        const res = await fetch(
          "/api/upwork-profile/chat",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: next,
            }),
          }
        );

        if (!res.ok) {
          const body = await res
            .json()
            .catch(() => ({}));

          throw new Error(
            body.error || `HTTP ${res.status}`
          );
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } =
            await reader.read();

          if (done) break;

          buffer += decoder.decode(value, {
            stream: true,
          });

          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            if (!event.startsWith("data: ")) {
              continue;
            }

            const json = event.slice(6).trim();

            if (!json) continue;

            try {
              const data = JSON.parse(json);

              if (data.content) {
                setMessages((previous) => {
                  const last =
                    previous[
                    previous.length - 1
                    ];

                  if (
                    !last ||
                    last.role !== "assistant"
                  ) {
                    return previous;
                  }

                  const copy = [...previous];

                  copy[copy.length - 1] = {
                    ...last,
                    content:
                      last.content +
                      data.content,
                  };

                  return copy;
                });
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (err: unknown) {
              if (err instanceof Error) {
                throw err;
              }
            }
          }
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Unknown error";

        setError(message);

        setMessages((previous) => {
          const copy = [...previous];
          const last =
            copy[copy.length - 1];

          if (
            last &&
            last.role === "assistant" &&
            !last.content
          ) {
            copy[copy.length - 1] = {
              ...last,
              content:
                "Sorry, something went wrong. Please try again.",
            };
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
    if (!confirm("Clear this chat history?")) {
      return;
    }

    setMessages([]);
    setError(null);

    try {
      localStorage.removeItem(STORAGE_PREFIX);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <div
      className={`flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_14px_45px_rgba(0,0,0,0.06)] ${className ?? ""}`}
    >
      {/* Header */}
      <div className="relative flex shrink-0 items-center gap-3 overflow-hidden bg-[#0A0A0A] px-4 py-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-14 size-32 rounded-full bg-[#00C98B]/15 blur-3xl"
        />

        <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#00C98B]/25 bg-[#00C98B]/10 text-[#00C98B]">
          <MessageSquare className="size-4" />
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-heading text-sm font-bold text-white">
              Profile Auditor
            </p>

            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#00C98B]/20 bg-[#00C98B]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#00C98B]">
              <span className="size-1 rounded-full bg-[#00C98B]" />
              AI
            </span>
          </div>

          <p className="mt-0.5 truncate text-[10px] text-white/45">
            AI feedback for your Upwork profile
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          title="Clear chat"
          aria-label="Clear profile audit chat"
          disabled={messages.length === 0}
          className="relative size-8 shrink-0 rounded-lg text-white/45 hover:bg-white/10 hover:text-[#00C98B]"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="min-h-0 flex-1 bg-white">
        <div
          ref={scrollRef}
          className="space-y-4 p-4"
        >
          {messages.length === 0 && (
            <div className="flex min-h-[250px] flex-col items-center justify-center px-3 py-8 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-2xl bg-[#00C98B]/20 blur-xl" />

                <div className="relative flex size-12 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#00C98B] shadow-lg">
                  <Sparkles className="size-5" />
                </div>
              </div>

              <p className="font-heading text-sm font-bold text-[#0A0A0A]">
                Audit your profile with AI
              </p>

              <p className="mx-auto mt-2 max-w-[280px] text-[11px] leading-relaxed text-black/45">
                Get focused feedback on your bio,
                skills, portfolio, niche and current
                market fit.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#00C98B]/20 bg-[#00C98B]/5 px-3 py-1.5 text-[10px] font-medium text-[#007A56]">
                <span className="size-1.5 animate-pulse rounded-full bg-[#00C98B]" />
                Ready for your first question
              </div>
            </div>
          )}

          {messages.map((message, index) => {
            const isUser =
              message.role === "user";

            return (
              <div
                key={index}
                className={`flex items-end gap-2 ${isUser
                    ? "justify-end"
                    : "justify-start"
                  }`}
              >
                {!isUser && (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] text-[#00C98B]">
                    <Sparkles className="size-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] break-words px-3.5 py-2.5 text-[12px] leading-relaxed ${isUser
                      ? "rounded-2xl rounded-br-md bg-[#0A0A0A] text-white shadow-[0_6px_18px_rgba(0,0,0,0.1)]"
                      : "rounded-2xl rounded-bl-md border border-black/5 bg-[#F7F8F8] text-black/65"
                    }`}
                >
                  {isUser ? (
                    <span className="whitespace-pre-wrap">
                      {message.content}
                    </span>
                  ) : (
                    <div className="chat-md">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={mdComponents}
                      >
                        {message.content ||
                          ((streaming &&
                            index ===
                            messages.length - 1)
                            ? "…"
                            : "")}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-black/10 bg-[#F7F8F8] px-3 py-2.5">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#00C98B]" />

              <p className="text-[11px] leading-relaxed text-black/55">
                {error}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="shrink-0 border-t border-black/5 bg-[#FAFAFA] px-3 py-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={streaming}
              onClick={() =>
                sendMessage(action.prompt)
              }
              className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-black/10 bg-white px-2.5 text-[10px] font-medium text-black/50 transition-all hover:border-[#00C98B]/30 hover:bg-[#00C98B]/10 hover:text-[#007A56] disabled:pointer-events-none disabled:opacity-40"
            >
              <action.icon className="size-3 text-[#00C98B]" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <div className="shrink-0 border-t border-black/5 bg-white p-3">
        <div className="flex items-end gap-2 rounded-xl border border-black/10 bg-[#F7F8F8] p-1.5 transition-colors focus-within:border-[#00C98B]/50 focus-within:ring-2 focus-within:ring-[#00C98B]/10">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask about your profile..."
            rows={2}
            className="min-h-10 max-h-28 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-[12px] leading-relaxed text-[#0A0A0A] outline-none placeholder:text-black/30"
          />

          <Button
            type="button"
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={
              streaming || !input.trim()
            }
            aria-label="Send message"
            className="size-9 shrink-0 rounded-lg bg-[#0A0A0A] text-white hover:bg-[#00C98B] hover:text-[#0A0A0A]"
          >
            {streaming ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
          </Button>
        </div>

        <p className="mt-1.5 text-center text-[9px] text-black/35">
          Press Enter to send · Shift + Enter for
          a new line
        </p>
      </div>
    </div>
  );
}