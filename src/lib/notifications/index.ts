/**
 * UpScore Notification Engine
 *
 * Routes job alerts through user-configured notification channels.
 * Supports: Email, Telegram, Slack, Discord, Webhook
 *
 * Flow:
 *  1. evaluateRules() — check which channel rules match a job's scores
 *  2. dispatch() — send the alert through the channel's sender
 *  3. logNotification() — record the result in the notifications table
 */
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { NotificationRule } from "@/lib/supabase/database-types";
import { sendEmail } from "./senders/email";
import { sendTelegram } from "./senders/telegram";
import { sendSlack } from "./senders/slack";
import { sendDiscord } from "./senders/discord";
import { sendWebhook } from "./senders/webhook";

// ─── Types ───

export interface JobAlertContext {
  jobId: string;        // DB job ID (UUID)
  upworkJobId: string;  // Upwork ciphertext
  title: string;
  url?: string;
  budget?: string;
  country?: string;
  skills?: string[];
  matchScore?: number;
  opportunityScore?: number;
  winProbability?: number;
  recommendation?: string;
  proposalTips?: string[];
}

export interface DispatchResult {
  channelId: string;
  channelName: string;
  channelType: string;
  ok: boolean;
  error?: string;
}

// ─── Channel Type ───

type ChannelType = "email" | "telegram" | "slack" | "discord" | "webhook" | "sms";

// Lightweight channel type for the query result
interface ChannelRow {
  id: string;
  name: string;
  type: string;
  config: any;
  is_active: boolean;
}

// ─── Main Dispatcher ───

/**
 * Evaluate all active notification rules for a user against a job alert,
 * and dispatch notifications to matching channels.
 */
export async function notifyUser(
  userId: string,
  alert: JobAlertContext
): Promise<DispatchResult[]> {
  const supabase = await createSupabaseAdminClient();

  // 1. Get all active channels + rules for this user
  const { data: rawChannels, error: channelError } = await supabase
    .from("notification_channels")
    .select("id, name, type, config, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (channelError || !rawChannels || rawChannels.length === 0) {
    return [];
  }

  const channels = rawChannels as unknown as ChannelRow[];

  const { data: rules, error: ruleError } = await supabase
    .from("notification_rules")
    .select("id, channel_id, job_filter_id, match_score_min, opportunity_score_min, max_proposals, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (ruleError || !rules || rules.length === 0) {
    return [];
  }

  // 2. Check each rule against this job
  const results: DispatchResult[] = [];

  for (const rule of rules) {
    const channel = channels.find((c) => c.id === rule.channel_id);
    if (!channel) continue;

    // Check score thresholds
    const matchScore = alert.matchScore ?? 0;
    const oppScore = alert.opportunityScore ?? 0;
    const matchMin = rule.match_score_min ?? 75;
    const oppMin = rule.opportunity_score_min ?? 70;

    if (matchScore < matchMin || oppScore < oppMin) continue;

    // 3. Build message payload
    const payload = buildJobAlertPayload(alert, channel);

    // 4. Dispatch via channel type
    const dispatchResult = await sendToChannel(channel, payload);

    // 5. Log notification in DB
    await logNotification(supabase, userId, alert.jobId, channel.name, dispatchResult);

    results.push({
      channelId: channel.id,
      channelName: channel.name,
      channelType: channel.type,
      ok: dispatchResult.ok,
      error: dispatchResult.error,
    });
  }

  return results;
}

// ─── Per-channel dispatch ───

async function sendToChannel(
  channel: ChannelRow,
  payload: JobAlertPayload
): Promise<{ ok: boolean; error?: string }> {
  const config = channel.config;

  switch (channel.type as ChannelType) {
    case "email":
      return sendEmail(config as any, {
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });

    case "telegram":
      return sendTelegram(config as any, {
        text: payload.text,
      });

    case "slack":
      return sendSlack(config as any, {
        text: payload.text,
        blocks: payload.slackBlocks,
      });

    case "discord":
      return sendDiscord(config as any, {
        content: payload.text.slice(0, 2000),
        embeds: payload.discordEmbeds as any,
      });

    case "webhook":
      return sendWebhook(config as any, {
        event: "job_alert",
        ...payload.webhookData,
      });

    case "sms":
      // SMS not yet implemented (requires Twilio)
      return { ok: false, error: "SMS sender not yet available" };

    default:
      return { ok: false, error: `Unknown channel type: ${channel.type}` };
  }
}

// ─── Payload Builder ───

interface JobAlertPayload {
  subject: string;
  text: string;
  html?: string;
  slackBlocks?: unknown[];
  discordEmbeds?: unknown[];
  webhookData: Record<string, unknown>;
}

function buildJobAlertPayload(
  alert: JobAlertContext,
  channel: ChannelRow
): JobAlertPayload {
  const scoreLine = alert.matchScore
    ? `🎯 Match Score: ${alert.matchScore}/100 | Opportunity: ${alert.opportunityScore}/100`
    : "";
  const recLine = alert.recommendation
    ? `🏆 Recommendation: ${alert.recommendation.toUpperCase()}`
    : "";
  const tipLines = alert.proposalTips?.length
    ? `\n💡 Tips:\n${alert.proposalTips.slice(0, 3).map((t) => `  • ${t}`).join("\n")}`
    : "";

  const title = `🚀 ${alert.title}`;
  const body = [
    scoreLine,
    recLine,
    alert.budget ? `💰 Budget: ${alert.budget}` : "",
    alert.country ? `🌍 Client: ${alert.country}` : "",
    alert.skills?.length ? `🏷 Skills: ${alert.skills.join(", ")}` : "",
    alert.url ? `🔗 ${alert.url}` : "",
    tipLines,
  ]
    .filter(Boolean)
    .join("\n");

  const text = `${title}\n\n${body}`;

  // HTML version for email
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">${title}</h2>
      ${scoreLine ? `<p style="font-size: 14px; color: #6b7280;">${scoreLine}</p>` : ""}
      ${recLine ? `<p style="font-size: 14px; color: #6b7280;">${recLine}</p>` : ""}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
      <table style="font-size: 14px; line-height: 1.6;">
        ${alert.budget ? `<tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">💰 Budget</td><td>${alert.budget}</td></tr>` : ""}
        ${alert.country ? `<tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">🌍 Client</td><td>${alert.country}</td></tr>` : ""}
        ${alert.skills?.length ? `<tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">🏷 Skills</td><td>${alert.skills.join(", ")}</td></tr>` : ""}
      </table>
      ${alert.url ? `<p style="margin-top: 16px;"><a href="${alert.url}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">View on Upwork</a></p>` : ""}
      ${tipLines ? `<div style="margin-top: 16px; padding: 12px; background: #f3f4f6; border-radius: 6px; font-size: 13px;">${alert.proposalTips?.slice(0, 3).map((t) => `<p>💡 ${t}</p>`).join("")}</div>` : ""}
    </div>
  `;

  // Slack blocks
  const slackBlocks = [
    {
      type: "header",
      text: { type: "plain_text", text: title, emoji: true },
    },
    ...(scoreLine
      ? [{ type: "section", text: { type: "mrkdwn", text: scoreLine } }]
      : []),
    ...(recLine
      ? [{ type: "section", text: { type: "mrkdwn", text: recLine } }]
      : []),
    {
      type: "section",
      fields: [
        ...(alert.budget ? [{ type: "mrkdwn", text: `*💰 Budget:*\n${alert.budget}` }] : []),
        ...(alert.country ? [{ type: "mrkdwn", text: `*🌍 Client:*\n${alert.country}` }] : []),
        ...(alert.skills?.length
          ? [{ type: "mrkdwn", text: `*🏷 Skills:*\n${alert.skills.join(", ")}` }]
          : []),
      ],
    },
    ...(alert.url
      ? [{ type: "section", text: { type: "mrkdwn", text: `<${alert.url}|View on Upwork>` } }]
      : []),
    ...(alert.proposalTips?.length
      ? [
          { type: "divider" },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*💡 Proposal Tips:*\n${alert.proposalTips.slice(0, 3).map((t) => `• ${t}`).join("\n")}`,
            },
          },
        ]
      : []),
  ];

  // Discord embeds
  const discordEmbeds = [
    {
      title: alert.title,
      url: alert.url || undefined,
      color: alert.matchScore && alert.matchScore >= 80 ? 0x22c55e : 0x3b82f6,
      fields: [
        ...(scoreLine ? [{ name: "Score", value: scoreLine, inline: false }] : []),
        ...(recLine ? [{ name: "Recommendation", value: recLine, inline: false }] : []),
        ...(alert.budget ? [{ name: "Budget", value: alert.budget, inline: true }] : []),
        ...(alert.country ? [{ name: "Client", value: alert.country, inline: true }] : []),
        ...(alert.skills?.length
          ? [{ name: "Skills", value: alert.skills.slice(0, 5).join(", "), inline: false }]
          : []),
      ],
      ...(alert.proposalTips?.length
        ? {
            footer: {
              text: `💡 ${alert.proposalTips[0]}`,
            },
          }
        : {}),
    },
  ];

  return {
    subject: title,
    text,
    html,
    slackBlocks,
    discordEmbeds,
    webhookData: {
      title: alert.title,
      url: alert.url,
      scores: {
        match: alert.matchScore,
        opportunity: alert.opportunityScore,
        win_probability: alert.winProbability,
      },
      recommendation: alert.recommendation,
      budget: alert.budget,
      country: alert.country,
      skills: alert.skills,
      proposal_tips: alert.proposalTips,
    },
  };
}

// ─── DB Logging ───

async function logNotification(
  supabase: any,
  userId: string,
  jobId: string,
  channelName: string,
  result: { ok: boolean; error?: string }
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    job_id: jobId,
    channel: channelName,
    status: result.ok ? "sent" : "failed",
    sent_at: result.ok ? new Date().toISOString() : null,
  });
}
