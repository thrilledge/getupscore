"use client";

import {
  cloneElement,
  useEffect,
  useSyncExternalStore,
  useState,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  removeChatSession,
  sessionContextOf,
  SessionIcon,
  type ChatSession,
} from "@/lib/chat-sessions";
import { useChatSessions } from "@/hooks/use-chat-sessions";

const clientStore = {
  subscribe: () => () => {},
  getSnapshot: () => true,
  getServerSnapshot: () => false,
};

function useIsClient() {
  return useSyncExternalStore(
    clientStore.subscribe,
    clientStore.getSnapshot,
    clientStore.getServerSnapshot
  );
}

function makeSessionId(contextKey: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${contextKey}-${Date.now().toString(36)}-${rand}`;
}

type ChatChild = ReactElement<{
  onClose?: () => void;
  sessionId?: string;
}>;

interface SessionRowProps {
  session: ChatSession;
  active: boolean;
  onSelect: (session: ChatSession) => void;
  onDelete: (session: ChatSession) => void;
  compact: boolean;
}

function SessionRow({
  session,
  active,
  onSelect,
  onDelete,
  compact,
}: SessionRowProps) {
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg px-2 text-left transition-colors",
        compact ? "justify-center py-2" : "py-2",
        active
          ? "bg-[#00C98B]/15 text-[#00C98B]"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(session)}
        className={cn(
          "flex min-w-0 items-center gap-2.5",
          compact ? "flex-none" : "flex-1"
        )}
        title={session.title}
      >
        <SessionIcon
          kind={session.kind}
          className={cn(
            "size-4 shrink-0",
            session.kind === "job" ? "text-[#00C98B]/80" : "text-white/50"
          )}
        />
        {!compact && (
          <span className="truncate text-xs font-medium">{session.title}</span>
        )}
      </button>
      {!compact && (
        <button
          type="button"
          onClick={() => onDelete(session)}
          aria-label={`Delete session ${session.title}`}
          className="shrink-0 rounded p-1 text-white/30 opacity-0 transition-opacity hover:bg-white/10 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  );
}

interface ChatLauncherProps {
  label: string;
  /** context this launcher lives on: job id or "profile-audit" */
  contextKey: string;
  /** default session id (job.id or "profile-audit") */
  defaultSessionId: string;
  children: ChatChild;
}

export function ChatLauncher({
  label,
  contextKey,
  defaultSessionId,
  children,
}: ChatLauncherProps) {
  const isClient = useIsClient();
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return new URLSearchParams(window.location.search).get("chat") === "1";
    } catch {
      return false;
    }
  });
  const [hasOpened, setHasOpened] = useState(open);
  const [sessionsOpen, setSessionsOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState(defaultSessionId);
  const sessions = useChatSessions();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSelectSession = (session: ChatSession) => {
    if (activeSessionId === session.id) return;
    // Session belongs to this page's context → switch in place, no navigation.
    if (sessionContextOf(session) === contextKey) {
      setActiveSessionId(session.id);
      return;
    }
    // Other context (a different job, or profile) → navigate there.
    if (typeof window === "undefined") return;
    const base =
      session.kind === "job" ? `/jobs/${sessionContextOf(session)}` : "/upwork-profile";
    window.location.href = `${base}?chat=1`;
  };

  const handleDeleteSession = (session: ChatSession) => {
    removeChatSession(session.id);
    if (activeSessionId === session.id) {
      setActiveSessionId(defaultSessionId);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(makeSessionId(contextKey));
  };

  if (!isClient) return null;

  const contextSessions = sessions.filter(
    (session) => sessionContextOf(session) === contextKey
  );
  const otherSessions = sessions.filter(
    (session) => sessionContextOf(session) !== contextKey
  );

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => {
          setHasOpened(true);
          setOpen(true);
        }}
        aria-label={`Open ${label}`}
        className="group fixed bottom-5 right-5 z-[999] inline-flex h-13 items-center gap-2.5 rounded-full bg-[#0A0A0A] py-3.5 pr-5 pl-3.5 text-white shadow-[0_12px_38px_rgba(0,0,0,0.4)] ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:ring-[#00C98B]/60 hover:shadow-[0_16px_44px_rgba(0,0,0,0.45)]"
      >
        <span className="relative grid size-7 place-items-center rounded-full bg-[#00C98B] text-[#0A0A0A] transition-transform duration-300 group-hover:scale-105">
          <MessageSquare className="size-3.5" />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full border-2 border-[#0A0A0A] bg-[#00C98B] animate-pulse" />
        </span>
        <span className="text-sm leading-none font-semibold">{label}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1000]"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
          />

          <div className="absolute inset-0 flex overflow-hidden rounded-none bg-[#0A0A0A] shadow-2xl ring-1 ring-white/10 sm:inset-x-5 sm:inset-y-[5vh] sm:rounded-[28px] animate-in fade-in-0 slide-in-from-bottom-3 duration-200">
            <aside
              className={cn(
                "flex shrink-0 flex-col border-r border-white/10 bg-[#111314] transition-[width] duration-200 ease-out",
                sessionsOpen ? "w-60" : "w-14"
              )}
            >
              {/* Toggle row */}
              <div
                className={cn(
                  "flex items-center border-b border-white/10 py-3",
                  sessionsOpen ? "justify-end px-3" : "justify-center px-2"
                )}
              >
                <button
                  type="button"
                  onClick={() => setSessionsOpen((value) => !value)}
                  aria-label={
                    sessionsOpen ? "Toggle sidebar closed" : "Toggle sidebar open"
                  }
                  className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {sessionsOpen ? (
                    <PanelLeftClose className="size-4" />
                  ) : (
                    <PanelLeftOpen className="size-4" />
                  )}
                </button>
              </div>

              {sessionsOpen ? (
                <>
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-1.5 px-3 pt-2 text-[10px] font-medium text-white/40">
                    <span>Dashboard</span>
                    <ChevronRight className="size-3" />
                    <span className="text-[#00C98B]">AI Chat</span>
                  </div>

                  {/* New chat */}
                  <div className="p-3">
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="inline-flex w-full items-center gap-2 rounded-lg bg-[#00C98B] px-3 py-2 text-xs font-bold text-[#0A0A0A] shadow-[0_0_16px_rgba(0,201,139,0.25)] transition-colors hover:bg-[#00C98B]/90"
                    >
                      <Plus className="size-3.5" />
                      New chat
                    </button>
                  </div>

                  {/* Sessions for this page */}
                  <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
                    {contextSessions.length > 0 && (
                      <p className="px-2 pt-1 pb-1 text-[10px] font-medium tracking-wide text-white/35 uppercase">
                        This page
                      </p>
                    )}
                    {contextSessions.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        active={activeSessionId === session.id}
                        onSelect={handleSelectSession}
                        onDelete={handleDeleteSession}
                        compact={false}
                      />
                    ))}
                    {contextSessions.length === 0 && otherSessions.length === 0 && (
                      <p className="px-3 pt-4 text-center text-xs text-white/35">
                        No conversations yet.
                      </p>
                    )}

                    {otherSessions.length > 0 && (
                      <>
                        <p className="px-2 pt-2 pb-1 text-[10px] font-medium tracking-wide text-white/35 uppercase">
                          Other pages
                        </p>
                        {otherSessions.map((session) => (
                          <SessionRow
                            key={session.id}
                            session={session}
                            active={false}
                            onSelect={handleSelectSession}
                            onDelete={() => {}}
                            compact={false}
                          />
                        ))}
                      </>
                    )}
                  </nav>
                </>
              ) : (
                <nav className="flex-1 space-y-1 overflow-y-auto p-2">
                  {contextSessions.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      active={activeSessionId === session.id}
                      onSelect={handleSelectSession}
                      onDelete={handleDeleteSession}
                      compact
                    />
                  ))}
                </nav>
              )}
            </aside>

            <div className="relative min-w-0 flex-1">
              {hasOpened &&
                cloneElement(children, {
                  key: activeSessionId,
                  sessionId: activeSessionId,
                  onClose: () => setOpen(false),
                })}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}