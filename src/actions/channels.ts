"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { channelFormSchema } from "@/lib/validations/channel";
import type { Json, NotificationChannel } from "@/lib/supabase/database-types";

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
