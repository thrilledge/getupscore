/**
 * Zod validation schemas for Job Filters.
 */
import { z } from "zod";

export const filterFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  keywords: z.string().min(1, "At least one keyword is required"),
  min_budget: z.coerce.number().min(0).optional().nullable(),
  max_budget: z.coerce.number().min(0).optional().nullable(),
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
