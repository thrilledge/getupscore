"use client";

import { useEffect, useState } from "react";
import {
  SESSIONS_EVENT,
  listChatSessions,
  type ChatSession,
} from "@/lib/chat-sessions";

/**
 * Live list of chat sessions (Profile Auditor + jobs). Subscribes to changes
 * made by any chat component on the page (custom event) and cross-tab
 * localStorage writes (storage event).
 */
export function useChatSessions(): ChatSession[] {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    const refresh = () => setSessions(listChatSessions());
    refresh();
    window.addEventListener(SESSIONS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SESSIONS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return sessions;
}