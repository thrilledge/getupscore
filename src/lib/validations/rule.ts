/**
 * Zod validation schema for Notification Rules.
 * A rule links a channel with a filter and sets scoring thresholds.
 */
import { z } from "zod";

export const ruleFormSchema = z.object({
  channel_id: z.string().uuid("Please select a channel"),
  job_filter_id: z.string().uuid().optional().nullable(),
  match_score_min: z.coerce
    .number()
    .int()
    .min(0, "Minimum 0")
    .max(100, "Maximum 100")
    .optional()
    .default(75),
  opportunity_score_min: z.coerce
    .number()
    .int()
    .min(0, "Minimum 0")
    .max(100, "Maximum 100")
    .optional()
    .default(70),
  max_proposals: z.coerce
    .number()
    .int()
    .min(0, "Minimum 0")
    .optional()
    .default(20),
});

export type RuleFormValues = z.infer<typeof ruleFormSchema>;
