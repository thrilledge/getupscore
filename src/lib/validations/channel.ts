/**
 * Zod validation schemas for Notification Channels.
 */
import { z } from "zod";

const channelTypes = [
  "email",
  "telegram",
  "slack",
  "discord",
  "webhook",
  "sms",
  "whatsapp",
  "n8n",
  "make",
  "zapier",
] as const;

export type ChannelType = (typeof channelTypes)[number];

export const channelTypeLabels: Record<ChannelType, string> = {
  email: "Email",
  telegram: "Telegram",
  slack: "Slack",
  discord: "Discord",
  webhook: "Webhook",
  sms: "SMS",
  whatsapp: "WhatsApp",
  n8n: "n8n",
  make: "Make",
  zapier: "Zapier",
};

export const channelTypeIcons: Record<ChannelType, string> = {
  email: "Mail",
  telegram: "Send",
  slack: "MessageSquare",
  discord: "MessageCircle",
  webhook: "Webhook",
  sms: "Smartphone",
  whatsapp: "Phone",
  n8n: "Network",
  make: "Route",
  zapier: "Zap",
};

/**
 * Base fields common to all channel types.
 */
const baseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  type: z.enum(channelTypes),
});

/**
 * Type-specific config schemas.
 */
const configSchemas: Record<ChannelType, z.ZodType> = {
  email: z.object({
    to: z.string().email("Invalid email address"),
  }),
  telegram: z.object({
    bot_token: z.string().min(1, "Bot token is required"),
    chat_id: z.string().min(1, "Chat ID is required"),
  }),
  slack: z.object({
    webhook_url: z.string().url("Invalid webhook URL"),
  }),
  discord: z.object({
    webhook_url: z.string().url("Invalid webhook URL"),
  }),
  webhook: z.object({
    url: z.string().url("Invalid URL"),
    method: z.enum(["GET", "POST", "PUT"]).optional().default("POST"),
  }),
  sms: z.object({
    phone: z.string().min(1, "Phone number is required"),
    provider: z.string().optional(),
  }),
  whatsapp: z.object({
    phone: z.string().min(1, "Phone number is required"),
    base_url: z.string().url("Invalid OpenWA URL"),
    session_id: z.string().min(1, "Session ID is required"),
    api_key: z.string().min(1, "API key is required"),
  }),
  n8n: z.object({
    url: z.string().url("Invalid URL"),
    method: z.enum(["GET", "POST", "PUT"]).optional().default("POST"),
  }),
  make: z.object({
    url: z.string().url("Invalid URL"),
    method: z.enum(["GET", "POST", "PUT"]).optional().default("POST"),
  }),
  zapier: z.object({
    url: z.string().url("Invalid URL"),
    method: z.enum(["GET", "POST", "PUT"]).optional().default("POST"),
  }),
};

/**
 * Combined schema — uses discriminate union based on `type`.
 */
export const channelFormSchema = baseSchema
  .extend({
    config: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .superRefine((data, ctx) => {
    const configSchema = configSchemas[data.type];
    if (!configSchema) return;

    const result = configSchema.safeParse(data.config ?? {});
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          ...issue,
          path: ["config", ...issue.path.map(String)],
        });
      }
    }
  });

export type ChannelFormValues = z.infer<typeof channelFormSchema>;

/**
 * Get placeholder text for a config field.
 */
export function getConfigFieldPlaceholder(
  type: ChannelType,
  field: string
): string {
  const placeholders: Record<string, Record<string, string>> = {
    email: { to: "you@example.com" },
    telegram: {
      bot_token: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
      chat_id: "-1001234567890",
    },
    slack: { webhook_url: "https://hooks.slack.com/services/..." },
    discord: { webhook_url: "https://discord.com/api/webhooks/..." },
    webhook: { url: "https://example.com/webhook" },
    sms: { phone: "+1234567890" },
    whatsapp: {
      phone: "+1234567890",
      base_url: "http://144.91.85.40/openwa",
      session_id: "upscore",
      api_key: "openwa-api-key",
    },
    n8n: { url: "https://n8n.example.com/webhook/..." },
    make: { url: "https://hook.make.com/..." },
    zapier: { url: "https://hooks.zapier.com/hooks/catch/..." },
  };
  return placeholders[type]?.[field] ?? "";
}

/**
 * Label map for config fields.
 */
export function getConfigFieldLabel(
  type: ChannelType,
  field: string
): string {
  const labels: Record<string, Record<string, string>> = {
    email: { to: "Recipient Email" },
    telegram: { bot_token: "Bot Token", chat_id: "Chat ID" },
    slack: { webhook_url: "Webhook URL" },
    discord: { webhook_url: "Webhook URL" },
    webhook: { url: "Webhook URL", method: "HTTP Method" },
    sms: { phone: "Phone Number", provider: "Provider (optional)" },
    whatsapp: {
      phone: "Recipient Phone",
      base_url: "OpenWA Base URL",
      session_id: "Session ID",
      api_key: "API Key",
    },
    n8n: { url: "n8n Webhook URL", method: "HTTP Method" },
    make: { url: "Make Webhook URL", method: "HTTP Method" },
    zapier: { url: "Zapier Webhook URL", method: "HTTP Method" },
  };
  return labels[type]?.[field] ?? field;
}

/**
 * Get the config fields for a given channel type.
 */
export function getConfigFields(type: ChannelType): string[] {
  const fields: Record<ChannelType, string[]> = {
    email: ["to"],
    telegram: ["bot_token", "chat_id"],
    slack: ["webhook_url"],
    discord: ["webhook_url"],
    webhook: ["url", "method"],
    sms: ["phone", "provider"],
    whatsapp: ["phone", "base_url", "session_id", "api_key"],
    n8n: ["url", "method"],
    make: ["url", "method"],
    zapier: ["url", "method"],
  };
  return fields[type] ?? [];
}
