"use client";

import { CopilotChat } from "@/components/copilot-chat";

export function ProfileAuditChat({
  sessionId,
  className,
  onClose,
}: {
  sessionId?: string;
  className?: string;
  onClose?: () => void;
}) {
  const sid = sessionId ?? "profile-audit";
  return (
    <CopilotChat
      apiEndpoint="/api/upwork-profile/chat"
      storageKey={
        sid === "profile-audit"
          ? "upscore-profile-audit-chat-"
          : `upscore-profile-audit-chat-${sid}`
      }
      sessionId={sid}
      contextKey="profile-audit"
      sessionKind="profile"
      sessionTitle="Profile Auditor"
      onClose={onClose}
      className={className}
    />
  );
}