/**
 * Database entity types — friendly aliases for auto-generated Supabase types.
 * Import these instead of accessing Database['public']['Tables'] everywhere.
 */
import type { Database } from "./types";

// ─── Table Row Types ───
export type ApiToken = Database["public"]["Tables"]["api_tokens"]["Row"];
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type JobAnalysis = Database["public"]["Tables"]["job_analyses"]["Row"];
export type JobFilter = Database["public"]["Tables"]["job_filters"]["Row"];
export type JobScore = Database["public"]["Tables"]["job_scores"]["Row"];
export type NotificationChannel = Database["public"]["Tables"]["notification_channels"]["Row"];
export type NotificationRule = Database["public"]["Tables"]["notification_rules"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type SavedJob = Database["public"]["Tables"]["saved_jobs"]["Row"];
export type Proposal = Database["public"]["Tables"]["proposals"]["Row"];
export type UpworkSession = Database["public"]["Tables"]["upwork_sessions"]["Row"];
export type UserPreference = Database["public"]["Tables"]["user_preferences"]["Row"];
export type UpworkProfile = Database["public"]["Tables"]["upwork_profiles"]["Row"];
export type Contract = Database["public"]["Tables"]["contracts"]["Row"];
export type WorkDiaryEntry = Database["public"]["Tables"]["work_diary_entries"]["Row"];

// ─── Insert Types ───
export type ApiTokenInsert = Database["public"]["Tables"]["api_tokens"]["Insert"];
export type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];
export type JobAnalysisInsert = Database["public"]["Tables"]["job_analyses"]["Insert"];
export type JobFilterInsert = Database["public"]["Tables"]["job_filters"]["Insert"];
export type JobScoreInsert = Database["public"]["Tables"]["job_scores"]["Insert"];
export type NotificationChannelInsert = Database["public"]["Tables"]["notification_channels"]["Insert"];
export type NotificationRuleInsert = Database["public"]["Tables"]["notification_rules"]["Insert"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
export type ProposalInsert = Database["public"]["Tables"]["proposals"]["Insert"];
export type UserPreferenceInsert = Database["public"]["Tables"]["user_preferences"]["Insert"];
export type UpworkProfileInsert = Database["public"]["Tables"]["upwork_profiles"]["Insert"];
export type ContractInsert = Database["public"]["Tables"]["contracts"]["Insert"];
export type WorkDiaryEntryInsert = Database["public"]["Tables"]["work_diary_entries"]["Insert"];

// ─── Update Types ───
export type JobFilterUpdate = Database["public"]["Tables"]["job_filters"]["Update"];
export type NotificationChannelUpdate = Database["public"]["Tables"]["notification_channels"]["Update"];
export type NotificationRuleUpdate = Database["public"]["Tables"]["notification_rules"]["Update"];
export type UserPreferenceUpdate = Database["public"]["Tables"]["user_preferences"]["Update"];
export type UpworkProfileUpdate = Database["public"]["Tables"]["upwork_profiles"]["Update"];
export type ContractUpdate = Database["public"]["Tables"]["contracts"]["Update"];
export type WorkDiaryEntryUpdate = Database["public"]["Tables"]["work_diary_entries"]["Update"];

// ─── JSON Type ───
export type { Json } from "./types";

// ─── Enums ───
export type ChannelType = Database["public"]["Enums"]["channel_type"];
export type NotificationStatus = Database["public"]["Enums"]["notification_status"];
export type ProposalStatus = Database["public"]["Enums"]["proposal_status"];
