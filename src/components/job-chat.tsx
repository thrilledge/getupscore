"use client";

import { CopilotChat } from "@/components/copilot-chat";

export function JobChat({
  jobId,
  jobTitle,
  sessionId,
  className,
  onClose,
}: {
  jobId: string;
  jobTitle: string;
  sessionId?: string;
  className?: string;
  onClose?: () => void;
}) {
  const sid = sessionId ?? jobId;
  return (
    <CopilotChat
      apiEndpoint={`/api/jobs/${jobId}/chat`}
      storageKey={`upscore-job-chat-${sid}`}
      sessionId={sid}
      contextKey={jobId}
      sessionKind="job"
      sessionTitle={jobTitle}
      showSaveToast
      onClose={onClose}
      className={className}
    />
  );
}