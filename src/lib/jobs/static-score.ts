/**
 * Static Pre-Filter — scores jobs at fetch time WITHOUT AI.
 *
 * For each active user filter, computes a 0-100 score based on:
 *   - Keyword/title match        (30 pts)
 *   - Skills overlap              (25 pts)
 *   - Budget fit                  (15 pts)
 *   - Client country match        (10 pts)
 *   - Low competition (proposals) (10 pts)
 *   - Client spend (if available) (10 pts)
 *
 * Returns the BEST score across all matching filters.
 * Jobs scoring >= MIN_STATIC_SCORE go to Inngest for AI analysis.
 */

export interface StaticScoreInput {
  title: string | null;
  description: string | null;
  skills: string[];
  budget: number | null;
  hourly_min: number | null;
  hourly_max: number | null;
  job_type: string | null;
  client_country: string | null;
  client_location_country: string | null;
  client_total_spend: number | null;
  proposals_count: number | null;
  category: string | null;
  subcategory: string | null;
}

export interface StaticFilterRule {
  id: string;
  user_id: string;
  keywords: string[];
  min_budget: number | null;
  max_budget: number | null;
  client_countries: string[];
  min_client_spend: number | null;
  max_proposals: number | null;
  skills: string[];
  is_active: boolean;
}

export interface StaticScoreResult {
  bestScore: number;
  matchedFilterId: string | null;
  pass: boolean;
}

export const MIN_STATIC_SCORE = 30;

function norm(s: string): string {
  return s.toLowerCase().trim();
}

function contains(needle: string, haystack: string): boolean {
  return norm(haystack).includes(norm(needle));
}

/**
 * Score a single job against a single filter rule. Returns 0-100.
 */
function scoreJobVsFilter(
  job: StaticScoreInput,
  filter: StaticFilterRule
): number {
  if (!filter.is_active) return 0;

  let score = 0;

  const haystack = [
    job.title || "",
    job.skills.join(" "),
    job.category || "",
    job.subcategory || "",
  ].join("\n").toLowerCase();

  // ── Keywords (30 pts) — HARD GATE ──
  // If the filter defines keywords and NONE match, the job is irrelevant for
  // this filter regardless of other signals. Return 0 so the job cannot pass
  // (MIN_STATIC_SCORE) on empty-bonus points alone — otherwise every job
  // floods the AI queue and matching jobs starve in the backlog.
  //
  // Keywords are matched against STRUCTURED fields only (title, skills,
  // category, subcategory) — NOT the free-text description, which is prose and
  // produced false positives (e.g. an "editing" keyword matching any job whose
  // description merely mentioned editing once).
  if (filter.keywords.length > 0) {
    const matched = filter.keywords.filter((k) => contains(k, haystack));
    if (matched.length === 0) return 0;
    const ratio = matched.length / filter.keywords.length;
    score += Math.round(30 * ratio);
  } else {
    score += 20;
  }

  // ── Skills (25 pts) ──
  if (filter.skills.length > 0 && job.skills.length > 0) {
    const filterSkills = new Set(filter.skills.map(norm));
    const overlap = job.skills.filter((s) => filterSkills.has(norm(s))).length;
    const ratio = Math.min(overlap / filter.skills.length, 1);
    score += Math.round(25 * ratio);
  } else if (filter.skills.length === 0) {
    score += 15;
  }

  // ── Budget fit (15 pts) ──
  const jobBudget = job.budget || job.hourly_max;
  if (jobBudget != null) {
    let budgetOk = true;
    if (filter.min_budget != null && jobBudget < filter.min_budget) budgetOk = false;
    if (filter.max_budget != null && jobBudget > filter.max_budget) budgetOk = false;
    score += budgetOk ? 15 : 0;
  } else {
    score += 8;
  }

  // ── Country match (10 pts) ──
  if (filter.client_countries.length > 0) {
    const country = job.client_location_country || job.client_country || "";
    if (country && filter.client_countries.some((c) => contains(c, country))) {
      score += 10;
    }
  } else {
    score += 5;
  }

  // ── Low competition (10 pts) ──
  if (job.proposals_count != null) {
    if (filter.max_proposals != null && job.proposals_count > filter.max_proposals) {
      return 0;
    }
    if (job.proposals_count <= 5) score += 10;
    else if (job.proposals_count <= 15) score += 7;
    else if (job.proposals_count <= 30) score += 4;
  } else {
    score += 5;
  }

  // ── Client spend (10 pts) ──
  if (filter.min_client_spend != null) {
    if (job.client_total_spend != null) {
      score += job.client_total_spend >= filter.min_client_spend ? 10 : 0;
    } else {
      score += 3;
    }
  } else {
    score += 5;
  }

  return Math.min(score, 100);
}

/**
 * Score a job against ALL active filters. Returns the best score + pass/fail.
 */
export function staticScore(
  job: StaticScoreInput,
  filters: StaticFilterRule[]
): StaticScoreResult {
  const activeFilters = filters.filter((f) => f.is_active);
  if (activeFilters.length === 0) {
    return { bestScore: 0, matchedFilterId: null, pass: false };
  }

  let bestScore = 0;
  let bestFilterId: string | null = null;

  for (const filter of activeFilters) {
    const s = scoreJobVsFilter(job, filter);
    if (s > bestScore) {
      bestScore = s;
      bestFilterId = filter.id;
    }
  }

  return {
    bestScore,
    matchedFilterId: bestFilterId,
    pass: bestScore >= MIN_STATIC_SCORE,
  };
}
