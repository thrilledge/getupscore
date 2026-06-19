/**
 * Telegram notification sender via Bot API.
 *
 * Config: { bot_token: string; chat_id: string }
 *
 * Note: If the user provides their own bot_token in the channel config,
 * we use that. Otherwise we fall back to the server-configured
 * TELEGRAM_BOT_TOKEN env var.
 */
import { env } from "@/lib/env";

export interface TelegramConfig {
  bot_token?: string;
  chat_id: string;
}

export interface TelegramPayload {
  text: string;
}

export async function sendTelegram(
  config: TelegramConfig,
  payload: TelegramPayload
): Promise<{ ok: boolean; error?: string }> {
  const botToken = config.bot_token || env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return {
      ok: false,
      error: "No Telegram bot token (provide in channel config or set TELEGRAM_BOT_TOKEN env var)",
    };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chat_id,
          text: payload.text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: (err as any)?.description || `Telegram returned ${response.status}`,
      };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
