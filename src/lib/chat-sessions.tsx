"use client";

import { Briefcase, Sparkles } from "lucide-react";

export type ChatSessionKind = "profile" | "job";

export type ChatSession = {
  id: string;
  kind: ChatSessionKind;
  title: string;
  updatedAt: number;
  /** page/context this session belongs to (job id, or "profile-audit") */
  contextKey?: string;
};

const SESSIONS_KEY = "upscore-chat-sessions";
export const SESSIONS_EVENT = "upscore:chat-sessions";

export function sessionContextOf(session: ChatSession): string {
  if (session.contextKey) return session.contextKey;
  return session.kind === "job" ? session.id : "profile-audit";
}

function readSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is ChatSession =>
        Boolean(s) &&
        typeof (s as ChatSession).id === "string" &&
        typeof (s as ChatSession).title === "string"
    );
  } catch {
    return [];
  }
}

function writeSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    window.dispatchEvent(new Event(SESSIONS_EVENT));
  } catch {
    // storage full or unavailable
  }
}

/**
 * Register (or bump to the top of) a chat session. Call this whenever a
 * conversation has real content so it shows up in the sessions sidebar.
 */
export function registerChatSession(input: {
  id: string;
  kind: ChatSessionKind;
  title: string;
  contextKey?: string;
}) {
  const sessions = readSessions();
  const existing = sessions.find((s) => s.id === input.id);
  const next = existing
    ? sessions.map((s) =>
        s.id === input.id
          ? {
              ...s,
              title: input.title,
              contextKey: input.contextKey ?? s.contextKey,
              updatedAt: Date.now(),
            }
          : s
      )
    : [
        ...sessions,
        {
          id: input.id,
          kind: input.kind,
          title: input.title,
          contextKey: input.contextKey,
          updatedAt: Date.now(),
        },
      ];
  writeSessions(next);
}

/**
 * Remove a chat session (e.g. when its history is cleared).
 */
export function removeChatSession(id: string) {
  writeSessions(readSessions().filter((s) => s.id !== id));
}

/**
 * All sessions, most recently active first.
 */
export function listChatSessions(): ChatSession[] {
  return readSessions().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function SessionIcon({
  kind,
  className,
}: {
  kind: ChatSessionKind;
  className?: string;
}) {
  return kind === "job" ? (
    <Briefcase className={className} />
  ) : (
    <Sparkles className={className} />
  );
}