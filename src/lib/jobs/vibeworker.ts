import type { JobInsert } from "@/lib/supabase/database-types";

/**
 * Vibeworker API — jobs fetched from https://tryvibeworker.com/api/jobs
 * using a logged-in session (no API key required).
 */

export interface VibeworkerClientStats {
  jobsPosted?: number | null;
  hireRate?: number | null;
  totalSpent?: number | null;
  paymentVerified?: boolean | null;
}

export interface VibeworkerJob {
  id: string;
  publicId: string;
  title: string;
  category?: string | null;
  jobType?: string | null;
  budget?: number | null;
  budgetMax?: number | null;
  experienceLevel?: string | null;
  duration?: string | null;
  connects?: number | null;
  skills?: string[];
  clientLocation?: string | null;
  clientRankScore?: number | null;
  clientStats?: VibeworkerClientStats;
  description?: string | null;
  upworkUrl?: string | null;
  platform?: string | null;
  receivedAt?: string | null;
  similarity?: number | null;
  percentile?: number | null;
  simSkills?: number | null;
  simScope?: number | null;
  simClient?: number | null;
  simRisks?: number | null;
  scoreQuickWin?: number | null;
  status?: string | null;
  proposalText?: string | null;
}

export interface VibeworkerResponse {
  success: boolean;
  jobs: VibeworkerJob[];
  count?: number;
  hasMore?: boolean;
  totalEmbedded?: number;
  error?: string;
}

/**
 * Map a single Vibeworker job into our jobs table shape.
 */
export type VibeworkerJobInsert = JobInsert & Record<string, unknown>;

export function mapVibeworkerJobToInsert(job: VibeworkerJob): VibeworkerJobInsert {
  const stats = job.clientStats || {};
  const isHourly = job.jobType === "hourly";
  const clientCountry = job.clientLocation?.slice(0, 100) || null;
  const clientScore = typeof job.clientRankScore === "number" ? job.clientRankScore : null;
  const totalSpend = typeof stats.totalSpent === "number" ? stats.totalSpent : null;
  const jobsPosted = typeof stats.jobsPosted === "number" ? stats.jobsPosted : null;
  const hireRate = typeof stats.hireRate === "number" ? stats.hireRate : null;
  const paymentVerified = stats.paymentVerified === true ? true : null;

  return {
    upwork_job_id: job.publicId || job.id,
    title: job.title.slice(0, 500),
    description: job.description?.slice(0, 10000) || null,
    url: job.upworkUrl?.slice(0, 1000) || null,
    budget: isHourly ? null : job.budget ?? null,
    hourly_min: isHourly ? job.budget ?? null : null,
    hourly_max: isHourly ? job.budgetMax ?? null : null,
    weekly_retainer: null,
    hours_per_week: null,
    job_type: job.jobType?.slice(0, 50) || null,
    contractor_tier: job.experienceLevel?.slice(0, 50) || null,
    duration_label: job.duration?.slice(0, 100) || null,
    duration_weeks: null,
    skills: Array.isArray(job.skills) ? job.skills.slice(0, 50) : [],
    client_country: clientCountry,
    client_location_country: clientCountry,
    client_hire_rate: hireRate,
    // Frontend Client Details section reads client_score / client_total_spend /
    // client_total_jobs_with_hires / client_payment_verified
    client_score: clientScore,
    client_rating: clientScore,
    client_total_spend: totalSpend,
    client_spend: totalSpend,
    client_total_jobs_with_hires: jobsPosted,
    client_total_assignments: jobsPosted,
    client_payment_verified: paymentVerified,
    payment_verified: paymentVerified,
    client_total_hires: null,
    client_name: null,
    client_member_since: null,
    client_industry: null,
    proposals_count: null,
    connects_required: typeof job.connects === "number" ? job.connects : null,
    posted_at: job.receivedAt || null,
    category: job.category?.slice(0, 100) || null,
    subcategory: null,
    source: "vibeworker",
  };
}

/**
 * Map an array of Vibeworker jobs to JobInsert[], skipping invalid entries.
 */
export function mapVibeworkerJobsToInserts(jobs: VibeworkerJob[]): VibeworkerJobInsert[] {
  const inserts: JobInsert[] = [];
  for (const job of jobs) {
    if (!job || !job.title || (!job.publicId && !job.id)) continue;
    inserts.push(mapVibeworkerJobToInsert(job));
  }
  return inserts;
}
