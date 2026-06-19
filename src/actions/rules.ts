"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ruleFormSchema } from "@/lib/validations/rule";
import type { NotificationRule } from "@/lib/supabase/database-types";

export type RuleActionResult = {
  success: boolean;
  error?: string;
  rule?: NotificationRule;
};

/**
 * Create a new notification rule.
 */
export async function createRule(
  formData: FormData
): Promise<RuleActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const raw = Object.fromEntries(formData);
  const parsed = ruleFormSchema.safeParse(raw);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { success: false, error: firstError };
  }

  const { channel_id, job_filter_id, match_score_min, opportunity_score_min, max_proposals } = parsed.data;

  const { data: rule, error } = await supabase
    .from("notification_rules")
    .insert({
      user_id: user.id,
      channel_id,
      job_filter_id: job_filter_id ?? null,
      match_score_min,
      opportunity_score_min,
      max_proposals,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/rules");
  return { success: true, rule };
}

/**
 * Update an existing notification rule.
 */
export async function updateRule(
  ruleId: string,
  formData: FormData
): Promise<RuleActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const raw = Object.fromEntries(formData);
  const parsed = ruleFormSchema.safeParse(raw);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { success: false, error: firstError };
  }

  const { channel_id, job_filter_id, match_score_min, opportunity_score_min, max_proposals } = parsed.data;

  const { data: rule, error } = await supabase
    .from("notification_rules")
    .update({
      channel_id,
      job_filter_id: job_filter_id ?? null,
      match_score_min,
      opportunity_score_min,
      max_proposals,
    })
    .eq("id", ruleId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/rules");
  return { success: true, rule };
}

/**
 * Toggle a rule's active status.
 */
export async function toggleRule(
  ruleId: string,
  isActive: boolean
): Promise<RuleActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: rule, error } = await supabase
    .from("notification_rules")
    .update({ is_active: isActive })
    .eq("id", ruleId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/rules");
  return { success: true, rule };
}

/**
 * Delete a notification rule.
 */
export async function deleteRule(
  ruleId: string
): Promise<RuleActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("notification_rules")
    .delete()
    .eq("id", ruleId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/rules");
  return { success: true };
}
