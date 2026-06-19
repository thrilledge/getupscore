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
] as const;

export type ChannelType = (typeof channelTypes)[number];

export const channelTypeLabels: Record<ChannelType, string> = {
  email: "Email",
  telegram: "Telegram",
  slack: "Slack",
  discord: "Discord",
  webhook: "Webhook",
  sms: "SMS",
};

export const channelTypeIcons: Record<ChannelType, string> = {
  email: "Mail",
  telegram: "Send",
  slack: "MessageSquare",
  discord: "MessageCircle",
  webhook: "Webhook",
  sms: "Smartphone",
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
  };
  return fields[type] ?? [];
}
