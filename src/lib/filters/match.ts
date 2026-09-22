/**
 * Filter matching — determines whether a job satisfies a saved job filter.
 *
 * Used to gate AI analysis + notifications so users only get alerted about
 * jobs that actually match their saved criteria (keywords, category,
 * budget, skills, client profile, etc.).
 */
import type { JobFilter } from "@/lib/supabase/database-types";

/**
 * The job fields we care about for matching. Everything else is ignored,
 * so a full `jobs` row (or a partially-fetched record) both work.
 */
export interface FilterMatchJob {
  id?: string;
  title?: string | null;
  description?: string | null;
  skills?: string[] | null;
  category?: string | null;
  subcategory?: string | null;
  job_type?: string | null;
  contractor_tier?: string | null;
  budget?: number | null;
  hourly_min?: number | null;
  hourly_max?: number | null;
  client_country?: string | null;
  client_location_country?: string | null;
  client_total_spend?: number | null;
  proposals_count?: number | null;
  [key: string]: unknown;
}

function norm(value: string): string {
  return value.toLowerCase().trim();
}

function normalizeJobType(value: string): string {
  return norm(value.replace(/\s+/g, "")).replace("fixed-price", "fixed").replace("fixedprice", "fixed");
}

function normalizeTier(value: string): string {
  return norm(value.replace(/\s+/g, "")).replace(/level$/, "");
}

function hasAny(list: string[] | null | undefined): boolean {
  return Array.isArray(list) && list.length > 0;
}

function contains(needle: string, haystack: string): boolean {
  if (!needle) return false;
  return norm(haystack).includes(norm(needle));
}

/**
 * Word-boundary, case-insensitive keyword match. Unlike plain substring
 * containment, "react" no longer matches "reaction" or "reactor".
 */
function containsKeyword(needle: string, haystack: string): boolean {
  if (!needle) return false;
  const escaped = norm(needle).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[^a-z0-9])${escaped}($|[^a-z0-9])`,
    "i"
  ).test(norm(haystack));
}

/**
 * Any keyword must appear (case-insensitive, whole word) somewhere in the
 * job's STRUCTURED fields: title, skills, category or subcategory. The
 * free-text description is intentionally excluded — prose matches are weak
 * signals and caused false positives (e.g. an "editing" keyword matching any
 * job whose description mentions editing once).
 */
export function keywordsMatch(job: FilterMatchJob, keywords: string[] | null | undefined): boolean {
  if (!Array.isArray(keywords) || keywords.length === 0) return true;
  const haystack = [
    job.title || "",
    (job.skills || []).join(" "),
    job.category || "",
    job.subcategory || "",
  ].join("\n");

  return keywords.some((k) => containsKeyword(k, haystack));
}

function jobCountry(job: FilterMatchJob): string {
  return job.client_location_country || job.client_country || "";
}

/**
 * Returns true when the job satisfies every populated criterion of the filter.
 * Filter fields that are null/empty are ignored (treated as "no preference").
 */
export function jobMatchesFilter(job: FilterMatchJob, filter: JobFilter): boolean {
  if (filter.is_active === false) return false;

  // Keywords — all required terms must be found
  if (!keywordsMatch(job, filter.keywords)) return false;

  // Job type — HOURLY vs FIXED
  if (filter.job_type) {
    const wanted = normalizeJobType(filter.job_type);
    if (wanted && normalizeJobType(job.job_type || "") !== wanted) return false;
  }

  // Contractor tier — Entry / Intermediate / Expert
  if (filter.contractor_tier) {
    const wanted = normalizeTier(filter.contractor_tier);
    if (wanted && normalizeTier(job.contractor_tier || "") !== wanted) return false;
  }

  // Category / subcategory
  if (filter.category && norm(job.category || "") !== norm(filter.category)) return false;
  if (filter.subcategory && norm(job.subcategory || "") !== norm(filter.subcategory)) return false;

  // Fixed-price budget range (only applies to fixed-price jobs that carry a budget)
  if (job.budget != null) {
    if (filter.min_budget != null && job.budget < filter.min_budget) return false;
    if (filter.max_budget != null && job.budget > filter.max_budget) return false;
  }

  // Hourly rate range (only applies to hourly jobs that carry a rate)
  if (job.hourly_min != null) {
    if (filter.hourly_min != null && job.hourly_min < filter.hourly_min) return false;
    if (filter.hourly_max != null && job.hourly_min > filter.hourly_max) return false;
  }

  // Skills — any overlap
  if (hasAny(filter.skills) && hasAny(job.skills)) {
    const wanted = new Set(filter.skills!.map(norm));
    const overlap = job.skills!.some((s) => wanted.has(norm(s)));
    if (!overlap) return false;
  } else if (hasAny(filter.skills) && !hasAny(job.skills)) {
    return false;
  }

  // Client country
  if (hasAny(filter.client_countries)) {
    const country = jobCountry(job);
    if (!country) return false;
    const matches = filter.client_countries!.some((c) => contains(c, country));
    if (!matches) return false;
  }

  // Client total spend (ignored when the job lacks the figure)
  if (filter.min_client_spend != null && job.client_total_spend != null) {
    if (job.client_total_spend < filter.min_client_spend) return false;
  }

  // Max proposal competition (ignored when the job lacks the figure)
  if (filter.max_proposals != null && job.proposals_count != null) {
    if (job.proposals_count > filter.max_proposals) return false;
  }

  return true;
}

/**
 * Returns every active filter that matches the given job.
 */
export function findMatchingFilters(
  job: FilterMatchJob,
  filters: JobFilter[]
): JobFilter[] {
  return filters.filter((f) => jobMatchesFilter(job, f));
}
