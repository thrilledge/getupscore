/**
 * Email notification sender via Resend.
 *
 * Config: { to: string }
 */
import { env } from "@/lib/env";

export interface EmailConfig {
  to: string;
}

export interface EmailPayload {
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(
  config: EmailConfig,
  payload: EmailPayload
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || "noreply@upscore.app",
        to: config.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html || payload.text.replace(/\n/g, "<br>"),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: (err as any)?.message || `Resend returned ${response.status}`,
      };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
