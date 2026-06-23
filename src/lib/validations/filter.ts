/**
 * Zod validation schemas for Job Filters.
 */
import { z } from "zod";

export const filterFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  keywords: z.string().min(1, "At least one keyword is required"),
  job_type: z.string().optional().default(""),
  contractor_tier: z.string().optional().default(""),
  category: z.string().optional().default(""),
  subcategory: z.string().optional().default(""),
  min_budget: z.coerce.number().min(0).optional().nullable(),
  max_budget: z.coerce.number().min(0).optional().nullable(),
  hourly_min: z.coerce.number().min(0).optional().nullable(),
  hourly_max: z.coerce.number().min(0).optional().nullable(),
  skills: z.string().optional().default(""),
  client_countries: z.string().optional().default(""),
  min_client_spend: z.coerce.number().min(0).optional().nullable(),
  max_proposals: z.coerce.number().int().min(0).optional().nullable(),
});

export type FilterFormValues = z.infer<typeof filterFormSchema>;

/**
 * Parse comma-separated strings into trimmed arrays.
 */
export function parseKeywords(input: string): string[] {
  return input
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}
