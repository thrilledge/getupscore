"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { channelFormSchema } from "@/lib/validations/channel";
import type { Json, NotificationChannel } from "@/lib/supabase/database-types";
import crypto from "crypto";
import { isSessionReachable } from "@/lib/whatsapp/openwa-client";

export type ChannelActionResult = {
  success: boolean;
  error?: string;
  channel?: NotificationChannel;
};

/**
 * Create a new notification channel for the authenticated user.
 */
export async function createChannel(
  formData: FormData
): Promise<ChannelActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  // Parse top-level fields
  const rawName = formData.get("name") as string;
  const rawType = formData.get("type") as string;

  // Parse config fields into an object
  const configFields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("config_")) {
      configFields[key.replace("config_", "")] = value as string;
    }
  }

  const parsed = channelFormSchema.safeParse({
    name: rawName,
    type: rawType,
    config: configFields,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { success: false, error: firstError };
  }

  const { name, type, config } = parsed.data;

  // Webhook-based channels (webhook, n8n, make, zapier) get an auto-generated
  // secret when the user doesn't provide one — the receiving side uses it to
  // verify the alert is genuinely from UpScore (header X-UpScore-Secret).
  if (
    ["webhook", "n8n", "make", "zapier"].includes(type) &&
    (!config.secret || String(config.secret).trim() === "")
  ) {
    config.secret = crypto.randomBytes(24).toString("hex");
  }

  // WhatsApp channels need the real OpenWA session ID (OpenWA only accepts
  // the session UUID on message routes) + digits-only phone. Resolve both
  // server-side so the senders never hit "missing phone/session".
  if (type === "whatsapp") {
    config.phone = String(config.phone ?? "").replace(/\D/g, "");
    const sessionCheck = await isSessionReachable(
      process.env.OPENWA_SESSION_ID || "upscore"
    );
    config.session_id =
      sessionCheck.ok && sessionCheck.session.id
        ? sessionCheck.session.id
        : process.env.OPENWA_SESSION_ID || "upscore";
  }

  const { data: channel, error } = await supabase
    .from("notification_channels")
    .insert({
      user_id: user.id,
      name,
      type,
      config: config as Json,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/channels");
  return { success: true, channel };
}

/**
 * Update an existing notification channel.
 */
export async function updateChannel(
  channelId: string,
  formData: FormData
): Promise<ChannelActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const rawName = formData.get("name") as string;
  const rawType = formData.get("type") as string;

  const configFields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("config_")) {
      configFields[key.replace("config_", "")] = value as string;
    }
  }

  const parsed = channelFormSchema.safeParse({
    name: rawName,
    type: rawType,
    config: configFields,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { success: false, error: firstError };
  }

  const { name, type, config } = parsed.data;

  // Preserve the existing webhook secret if the form left it blank, so an
  // edit that only changes the URL doesn't silently rotate the secret the
  // receiver is configured to verify.
  const isWebhookType = ["webhook", "n8n", "make", "zapier"].includes(type);
  if (isWebhookType && (!config.secret || String(config.secret).trim() === "")) {
    const { data: existing } = await supabase
      .from("notification_channels")
      .select("config")
      .eq("id", channelId)
      .eq("user_id", user.id)
      .maybeSingle();

    const oldSecret = (existing?.config as Record<string, unknown> | null)?.secret;
    if (oldSecret) {
      config.secret = String(oldSecret);
    }
  } else if (isWebhookType) {
    config.secret = String(config.secret);
  }

  // See createChannel — WhatsApp must always carry phone + session_id.
  if (type === "whatsapp") {
    config.phone = String(config.phone ?? "").replace(/\D/g, "");
    const sessionCheck = await isSessionReachable(
      process.env.OPENWA_SESSION_ID || "upscore"
    );
    config.session_id =
      sessionCheck.ok && sessionCheck.session.id
        ? sessionCheck.session.id
        : process.env.OPENWA_SESSION_ID || "upscore";
  }

  const { data: channel, error } = await supabase
    .from("notification_channels")
    .update({
      name,
      type,
      config: config as Json,
    })
    .eq("id", channelId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/channels");
  return { success: true, channel };
}

/**
 * Toggle a channel's active status.
 */
export async function toggleChannel(
  channelId: string,
  isActive: boolean
): Promise<ChannelActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: channel, error } = await supabase
    .from("notification_channels")
    .update({ is_active: isActive })
    .eq("id", channelId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/channels");
  return { success: true, channel };
}

/**
 * Delete a notification channel.
 */
export async function deleteChannel(
  channelId: string
): Promise<ChannelActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("notification_channels")
    .delete()
    .eq("id", channelId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/channels");
  return { success: true };
}
