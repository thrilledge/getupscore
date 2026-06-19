"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { filterFormSchema, parseKeywords } from "@/lib/validations/filter";
import type { JobFilter } from "@/lib/supabase/database-types";

export type FilterActionResult = {
  success: boolean;
  error?: string;
  filter?: JobFilter;
};

/**
 * Create a new job filter for the authenticated user.
 */
export async function createFilter(
  formData: FormData
): Promise<FilterActionResult> {
  const supabase = await createSupabaseServerClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  // Parse and validate
  const raw = Object.fromEntries(formData);
  const parsed = filterFormSchema.safeParse(raw);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { success: false, error: firstError };
  }

  const { name, min_budget, max_budget, min_client_spend, max_proposals, keywords, client_countries } = parsed.data;

  const { data: filter, error } = await supabase
    .from("job_filters")
    .insert({
      user_id: user.id,
      name,
      min_budget: min_budget ?? null,
      max_budget: max_budget ?? null,
      min_client_spend: min_client_spend ?? null,
      max_proposals: max_proposals ?? null,
      keywords: parseKeywords(keywords),
      client_countries: client_countries
        ? parseKeywords(client_countries)
        : [],
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/filters");
  return { success: true, filter };
}

/**
 * Update an existing job filter.
 */
export async function updateFilter(
  filterId: string,
  formData: FormData
): Promise<FilterActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const raw = Object.fromEntries(formData);
  const parsed = filterFormSchema.safeParse(raw);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { success: false, error: firstError };
  }

  const { name, min_budget, max_budget, min_client_spend, max_proposals, keywords, client_countries } = parsed.data;

  const { data: filter, error } = await supabase
    .from("job_filters")
    .update({
      name,
      min_budget: min_budget ?? null,
      max_budget: max_budget ?? null,
      min_client_spend: min_client_spend ?? null,
      max_proposals: max_proposals ?? null,
      keywords: parseKeywords(keywords),
      client_countries: client_countries
        ? parseKeywords(client_countries)
        : [],
    })
    .eq("id", filterId)
    .eq("user_id", user.id) // security check
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/filters");
  return { success: true, filter };
}

/**
 * Toggle a filter's active status.
 */
export async function toggleFilter(
  filterId: string,
  isActive: boolean
): Promise<FilterActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: filter, error } = await supabase
    .from("job_filters")
    .update({ is_active: isActive })
    .eq("id", filterId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/filters");
  return { success: true, filter };
}

/**
 * Delete a job filter.
 */
export async function deleteFilter(
  filterId: string
): Promise<FilterActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("job_filters")
    .delete()
    .eq("id", filterId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/filters");
  return { success: true };
}
