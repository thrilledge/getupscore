/**
 * Job Fetcher — Provider-based system for fetching jobs from Upwork.
 *
 * Providers:
 *  - mock: Returns sample jobs for development/testing
 *  - apify: Uses Apify's Upwork Jobs Scraper actor
 *  - upalerts: Uses upalerts.app public API (limited fields)
 *  - upwork_graphql: Uses Upwork's internal GraphQL API via curl_cffi (full data)
 *                    Requires Python + curl_cffi installed on the server/laptop
 *
 * Set JOB_FETCHER_PROVIDER=mock|apify|upalerts|upwork_graphql in .env.local
 */

import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import { env } from "@/lib/env";
import type { JobInsert } from "@/lib/supabase/database-types";

const execFileAsync = promisify(execFile);

// ─── Types ───

export interface FetcherJob {
  upwork_job_id: string;
  title: string;
  description: string | null;
  url: string | null;
  budget: number | null;
  hourly_min: number | null;
  hourly_max: number | null;
  weekly_retainer: number | null;
  hours_per_week: string | null;
  job_type: string | null;
  contractor_tier: string | null;
  duration_label: string | null;
  duration_weeks: number | null;
  skills: string[];
  client_country: string | null;
  client_name: string | null;
  client_rating: number | null;
  client_total_assignments: number | null;
  client_total_hires: number | null;
  client_total_spend: number | null;
  client_member_since: string | null;
  client_industry: string | null;
  proposals_count: number | null;
  total_invited: number | null;
  total_hired: number | null;
  payment_verified: boolean | null;
  posted_at: string | null;
  category: string | null;
  subcategory: string | null;
  source: string;
}

export interface FetchResult {
  success: boolean;
  jobs: FetcherJob[];
  error?: string;
  source: string;
}

// ─── Provider Interface ───

export type FetcherProvider = (query?: string) => Promise<FetchResult>;

// ─── Provider Registry ───

const providers: Record<string, FetcherProvider> = {
  mock: fetchMock,
  apify: fetchApify,
  upalerts: fetchUpalerts,
  upwork_graphql: fetchUpworkGraphql,
  upwork_api: fetchUpworkApi,
};

/**
 * Fetch jobs using the configured provider.
 */
export async function fetchJobs(query?: string): Promise<FetchResult> {
  const providerName = env.JOB_FETCHER_PROVIDER || "mock";
  const provider = providers[providerName];

  if (!provider) {
    console.warn(
      `[Fetcher] Unknown provider "${providerName}", falling back to mock`
    );
    return fetchMock(query);
  }

  console.log(`[Fetcher] Using provider: ${providerName}`);
  return provider(query);
}

/**
 * Convert FetcherJob[] to JobInsert[] for DB insertion.
 */
export function toJobInserts(jobs: FetcherJob[]): JobInsert[] {
  return jobs.map((j) => ({
    upwork_job_id: j.upwork_job_id,
    title: j.title.slice(0, 500),
    description: j.description?.slice(0, 10000) || null,
    url: j.url?.slice(0, 1000) || null,
    budget: j.budget ?? null,
    hourly_min: j.hourly_min ?? null,
    hourly_max: j.hourly_max ?? null,
    weekly_retainer: j.weekly_retainer ?? null,
    hours_per_week: j.hours_per_week?.slice(0, 50) || null,
    job_type: j.job_type?.slice(0, 50) || null,
    contractor_tier: j.contractor_tier?.slice(0, 50) || null,
    duration_label: j.duration_label?.slice(0, 100) || null,
    duration_weeks: j.duration_weeks ?? null,
    skills: j.skills || [],
    client_country: j.client_country?.slice(0, 100) || null,
    client_name: j.client_name?.slice(0, 200) || null,
    client_rating: j.client_rating ?? null,
    client_total_assignments: j.client_total_assignments ?? null,
    client_total_hires: j.client_total_hires ?? null,
    client_total_spend: j.client_total_spend ?? null,
    client_member_since: j.client_member_since?.slice(0, 50) || null,
    client_industry: j.client_industry?.slice(0, 200) || null,
    proposals_count: j.proposals_count ?? null,
    total_invited: j.total_invited ?? null,
    total_hired: j.total_hired ?? null,
    posted_at: j.posted_at || null,
    category: j.category ?? null,
    subcategory: j.subcategory ?? null,
    source: j.source,
  }));
}

// ════════════════════════════════════════════════════════════
// Provider: Mock (for dev/testing)
// ════════════════════════════════════════════════════════════

async function fetchMock(query?: string): Promise<FetchResult> {
  const searchQuery = query || "react developer";

  console.log(`[Fetcher:Mock] Generating mock jobs for "${searchQuery}"`);

  const now = Date.now();
  const mockJobs: FetcherJob[] = [
    {
      upwork_job_id: `mock_${now}_1`,
      title: `Senior ${capitalize(searchQuery)} — Full Time`,
      description: `We are looking for an experienced ${searchQuery} to join our team. You will be working on cutting-edge projects with modern technologies. Must have 5+ years of experience.\n\nRequirements:\n- Strong knowledge of ${searchQuery}\n- Experience with TypeScript, React, Node.js\n- Good communication skills\n- Ability to work independently`,
      url: "https://www.upwork.com/jobs/~mock1",
      budget: 5000,
      hourly_min: null,
      hourly_max: null,
      weekly_retainer: null,
      hours_per_week: null,
      job_type: "FIXED_PRICE",
      contractor_tier: "ExpertLevel",
      duration_label: "3 to 6 months",
      duration_weeks: 20,
      client_country: "United States",
      client_name: "TechCorp Inc.",
      client_rating: 4.8,
      client_total_assignments: 120,
      client_total_hires: 85,
      client_total_spend: 500000,
      client_member_since: "2018-03-15",
      client_industry: "Technology",
      proposals_count: 8,
      total_invited: 3,
      total_hired: 1,
      payment_verified: true,
      posted_at: new Date(now - 3600000).toISOString(),
      skills: ["React", "TypeScript", "Node.js", "GraphQL"],
      category: "Web Development",
      subcategory: "Frontend Development",
      source: "mock",
    },
    {
      upwork_job_id: `mock_${now}_2`,
      title: `${capitalize(searchQuery)} for Exciting Startup Project`,
      description: `We are a funded startup looking for a talented ${searchQuery} developer to build our MVP. This is a long-term opportunity with equity potential.\n\nScope:\n- Build web application from scratch\n- Implement responsive UI\n- Set up CI/CD pipeline\n- Deploy to production`,
      url: "https://www.upwork.com/jobs/~mock2",
      budget: null,
      hourly_min: 40,
      hourly_max: 65,
      weekly_retainer: null,
      hours_per_week: "Less than 30 hrs/week",
      job_type: "HOURLY",
      contractor_tier: "IntermediateLevel",
      duration_label: "1 to 3 months",
      duration_weeks: 9,
      client_country: "United Kingdom",
      client_name: "StartupXYZ",
      client_rating: 4.2,
      client_total_assignments: 15,
      client_total_hires: 10,
      client_total_spend: 75000,
      client_member_since: "2021-08-01",
      client_industry: "E-commerce",
      proposals_count: 22,
      total_invited: 5,
      total_hired: 2,
      payment_verified: true,
      posted_at: new Date(now - 7200000).toISOString(),
      skills: ["React", "Next.js", "Tailwind CSS", "PostgreSQL"],
      category: "Web Development",
      subcategory: "Full Stack Development",
      source: "mock",
    },
    {
      upwork_job_id: `mock_${now}_3`,
      title: `Urgent: Bug Fixes & ${capitalize(searchQuery)} Maintenance`,
      description: `Need help fixing bugs and maintaining our ${searchQuery} codebase. Small tasks but consistent work available.\n\nTasks:\n- Fix UI bugs\n- Optimize performance\n- Add small features\n- Code review`,
      url: "https://www.upwork.com/jobs/~mock3",
      budget: null,
      hourly_min: 25,
      hourly_max: 40,
      weekly_retainer: null,
      hours_per_week: "As needed",
      job_type: "HOURLY",
      contractor_tier: "EntryLevel",
      duration_label: "Less than 1 month",
      duration_weeks: 3,
      client_country: "Canada",
      client_name: "WebAgency",
      client_rating: null,
      client_total_assignments: 8,
      client_total_hires: 5,
      client_total_spend: 25000,
      client_member_since: "2023-02-10",
      client_industry: "Marketing",
      proposals_count: 45,
      total_invited: 0,
      total_hired: 0,
      payment_verified: false,
      posted_at: new Date(now - 18000000).toISOString(),
      skills: ["React", "JavaScript", "CSS"],
      category: "Web Development",
      subcategory: "Maintenance",
      source: "mock",
    },
  ];

  return {
    success: true,
    jobs: mockJobs,
    source: "mock",
  };
}

// ════════════════════════════════════════════════════════════
// Provider: Apify (production)
// ════════════════════════════════════════════════════════════

async function fetchApify(query?: string): Promise<FetchResult> {
  const apiKey = env.APIFY_API_KEY;
  if (!apiKey || apiKey === "your_apify_api_key_here") {
    return {
      success: false,
      jobs: [],
      error:
        "Apify API key not configured. Add APIFY_API_KEY to .env.local",
      source: "apify",
    };
  }

  const searchQuery = query || "react";

  // Apify Upwork Jobs Scraper actor
  const ACTOR_ID = "dSCud0PqBwCg5M3AN"; // Upwork Jobs Scraper
  const API_BASE = "https://api.apify.com/v2";

  try {
    // Start the actor run
    const runResponse = await fetch(
      `${API_BASE}/acts/${ACTOR_ID}/runs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          runInput: {
            searchQuery: searchQuery,
            maxResults: 20,
            proxy: { useApifyProxy: true },
          },
        }),
      }
    );

    if (!runResponse.ok) {
      const err = await runResponse.text();
      return {
        success: false,
        jobs: [],
        error: `Apify run start failed: ${err}`,
        source: "apify",
      };
    }

    const runData = await runResponse.json();
    const runId = runData.id;

    if (!runId) {
      return {
        success: false,
        jobs: [],
        error: "No run ID returned from Apify",
        source: "apify",
      };
    }

    // Wait for completion and fetch results
    // In production, use webhooks instead of polling
    await delay(10000); // Wait 10s for the actor to finish

    const resultsResponse = await fetch(
      `${API_BASE}/acts/${ACTOR_ID}/runs/${runId}/dataset/items`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!resultsResponse.ok) {
      return {
        success: false,
        jobs: [],
        error: `Failed to fetch Apify results: ${resultsResponse.status}`,
        source: "apify",
      };
    }

    const items = await resultsResponse.json();

    const jobs: FetcherJob[] = (items || []).map((item: any) => ({
      upwork_job_id: item.jobId || item.id || `apify_${Date.now()}`,
      title: item.title || "Untitled",
      description: item.description || item.body || null,
      url: item.url || `https://www.upwork.com/jobs/~${item.jobId}`,
      budget: item.budget?.amount ? parseFloat(item.budget.amount) : null,
      hourly_min: item.hourlyMin || null,
      hourly_max: item.hourlyMax || null,
      client_country: item.client?.country || item.country || null,
      proposals_count: item.proposalsCount || null,
      posted_at: item.publishedDate || item.createdAt || null,
      skills: item.skills || [],
      client_name: item.client?.name || null,
      payment_verified: item.client?.paymentVerified ?? null,
      category: null,
      subcategory: null,
      source: "apify",
    }));

    return {
      success: true,
      jobs,
      source: "apify",
    };
  } catch (err: any) {
    console.error("[Fetcher:Apify] Error:", err);
    return {
      success: false,
      jobs: [],
      error: err.message || "Apify fetch failed",
      source: "apify",
    };
  }
}

// ════════════════════════════════════════════════════════════
// Provider: UpAlerts (primary — uses upalerts.app public API)
// ════════════════════════════════════════════════════════════

interface UpalertsJob {
  title: string;
  budget: string | null;
  postedAt: string;
  category: string | null;
  subcategory: string | null;
  clientCountry: string | null;
  paymentVerified: boolean;
}

interface UpalertsResponse {
  jobs: UpalertsJob[];
  category: string | null;
  fallback: boolean;
}

async function fetchUpalerts(query?: string): Promise<FetchResult> {
  const baseUrl = process.env.UPALERTS_API_URL || "https://upalerts.app/api/public/jobs";
  const feedUrl = `${baseUrl}/feed?limit=50${query ? `&category=${encodeURIComponent(query)}` : ""}`;

  console.log(`[Fetcher:UpAlerts] Fetching jobs from ${feedUrl}`);

  try {
    const response = await fetch(feedUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "UpScore/1.0",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        jobs: [],
        error: `UpAlerts returned ${response.status}: ${response.statusText}`,
        source: "upalerts",
      };
    }

    const data: UpalertsResponse = await response.json();
    const rawJobs = data.jobs || [];

    if (rawJobs.length === 0) {
      return { success: true, jobs: [], source: "upalerts" };
    }

    const jobs: FetcherJob[] = rawJobs.map((j) => {
      const { budget, hourlyMin, hourlyMax } = parseBudgetString(j.budget);
      // Guard against malformed timestamps — one bad value must not kill the batch.
      const postedAt =
        j.postedAt && !Number.isNaN(Date.parse(j.postedAt))
          ? new Date(j.postedAt).toISOString()
          : null;

      return {
        upwork_job_id: generateUpalertsJobId(j.title, postedAt || j.postedAt),
        title: j.title.slice(0, 500),
        description: null,
        url: null,
        budget,
        hourly_min: hourlyMin,
        hourly_max: hourlyMax,
        weekly_retainer: null,
        hours_per_week: null,
        job_type: null,
        contractor_tier: null,
        duration_label: null,
        duration_weeks: null,
        client_country: j.clientCountry?.slice(0, 100) || null,
        client_name: null,
        client_rating: null,
        client_total_assignments: null,
        client_total_hires: null,
        client_total_spend: null,
        client_member_since: null,
        client_industry: null,
        proposals_count: null,
        total_invited: null,
        total_hired: null,
        posted_at: postedAt,
        skills: [],
        payment_verified: j.paymentVerified,
        category: j.category,
        subcategory: j.subcategory,
        source: "upalerts",
      };
    });

    console.log(`[Fetcher:UpAlerts] Fetched ${jobs.length} jobs`);
    return {
      success: true,
      jobs,
      source: "upalerts",
    };
  } catch (err: any) {
    console.error("[Fetcher:UpAlerts] Error:", err);
    return {
      success: false,
      jobs: [],
      error: err.message || "UpAlerts fetch failed",
      source: "upalerts",
    };
  }
}

// ════════════════════════════════════════════════════════════
// Provider: Upwork API (via self-hosted Python API on EC2)
// ════════════════════════════════════════════════════════════

interface UpworkApiJob {
  upwork_job_id: string;
  title: string;
  description?: string;
  url?: string;
  budget?: number | null;
  hourly_min?: number | string | null;
  hourly_max?: number | string | null;
  weekly_retainer?: number | string | null;
  hours_per_week?: string;
  job_type?: string;
  contractor_tier?: string;
  duration_label?: string;
  duration_weeks?: number | string | null;
  skills?: string[];
  client_rating?: number | null;
  posted_at?: string;
  category?: string | null;
  subcategory?: string | null;
  source: string;
}

interface UpworkApiResponse {
  success: boolean;
  jobs: UpworkApiJob[];
  total?: number;
  offset?: number;
  count?: number;
  error?: string;
}

async function fetchUpworkApi(query?: string): Promise<FetchResult> {
  const apiUrl = process.env.UPWORK_API_URL || "http://13.48.204.110/jobs";
  const count = 50;
  const url = `${apiUrl}?count=${count}&offset=0`;

  console.log(`[Fetcher:UpworkAPI] Fetching jobs from ${url}`);

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      return {
        success: false,
        jobs: [],
        error: `Upwork API returned ${response.status}`,
        source: "upwork_api",
      };
    }

    const result: UpworkApiResponse = await response.json();

    if (!result.success) {
      return {
        success: false,
        jobs: [],
        error: result.error || "Upwork API returned failure",
        source: "upwork_api",
      };
    }

    if (!result.jobs || result.jobs.length === 0) {
      return { success: true, jobs: [], source: "upwork_api" };
    }

    const jobs: FetcherJob[] = result.jobs.map((j) => ({
      upwork_job_id: j.upwork_job_id,
      title: j.title.slice(0, 500),
      description: j.description?.slice(0, 10000) || null,
      url: j.url?.slice(0, 1000) || null,
      budget: j.budget ?? null,
      hourly_min: j.hourly_min ? parseFloat(String(j.hourly_min)) : null,
      hourly_max: j.hourly_max ? parseFloat(String(j.hourly_max)) : null,
      weekly_retainer: j.weekly_retainer ? parseFloat(String(j.weekly_retainer)) : null,
      hours_per_week: j.hours_per_week || null,
      job_type: j.job_type || null,
      contractor_tier: j.contractor_tier || null,
      duration_label: j.duration_label || null,
      duration_weeks: j.duration_weeks ? parseInt(String(j.duration_weeks)) : null,
      client_country: null,
      client_name: null,
      client_rating: null,
      client_total_assignments: null,
      client_total_hires: null,
      client_total_spend: null,
      client_member_since: null,
      client_industry: null,
      proposals_count: null,
      total_invited: null,
      total_hired: null,
      payment_verified: null,
      posted_at: j.posted_at || null,
      skills: j.skills || [],
      category: j.category ?? null,
      subcategory: j.subcategory ?? null,
      source: "upwork_api",
    }));

    console.log(`[Fetcher:UpworkAPI] Fetched ${jobs.length} jobs`);
    return {
      success: true,
      jobs,
      source: "upwork_api",
    };
  } catch (err: any) {
    console.error("[Fetcher:UpworkAPI] Error:", err);
    return {
      success: false,
      jobs: [],
      error: err.message || "Upwork API fetch failed",
      source: "upwork_api",
    };
  }
}

// ════════════════════════════════════════════════════════════
// Provider: Upwork GraphQL (via curl_cffi — no browser needed)
// ════════════════════════════════════════════════════════════

interface GraphQLJob {
  upwork_job_id: string;
  title: string;
  description?: string;
  url?: string;
  budget?: number | null;
  hourly_min?: number | null;
  hourly_max?: number | null;
  job_type?: string;
  contractor_tier?: string;
  skills?: string[];
  posted_at?: string;
  category?: string | null;
  subcategory?: string | null;
  source: string;
}

interface GraphQLResponse {
  success: boolean;
  jobs: GraphQLJob[];
  total?: number;
  offset?: number;
  count?: number;
  error?: string;
}

async function fetchUpworkGraphql(query?: string): Promise<FetchResult> {
  const pythonScript = path.join(process.cwd(), "scripts", "upwork_scraper.py");

  try {
    const args: string[] = ["--count", "50"];
    const { stdout, stderr } = await execFileAsync("python", [pythonScript, ...args], {
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const result: GraphQLResponse = JSON.parse(stdout);

    if (!result.success) {
      return {
        success: false,
        jobs: [],
        error: result.error || "Python scraper returned failure",
        source: "upwork_graphql",
      };
    }

    if (!result.jobs || result.jobs.length === 0) {
      return { success: true, jobs: [], source: "upwork_graphql" };
    }

    const jobs: FetcherJob[] = result.jobs.map((j) => ({
      upwork_job_id: j.upwork_job_id,
      title: j.title.slice(0, 500),
      description: j.description?.slice(0, 10000) || null,
      url: j.url?.slice(0, 1000) || null,
      budget: j.budget ?? null,
      hourly_min: j.hourly_min ?? null,
      hourly_max: j.hourly_max ?? null,
      weekly_retainer: null,
      hours_per_week: null,
      job_type: null,
      contractor_tier: null,
      duration_label: null,
      duration_weeks: null,
      client_country: null,
      client_name: null,
      client_rating: null,
      client_total_assignments: null,
      client_total_hires: null,
      client_total_spend: null,
      client_member_since: null,
      client_industry: null,
      proposals_count: null,
      total_invited: null,
      total_hired: null,
      posted_at: j.posted_at || null,
      skills: j.skills || [],
      payment_verified: null,
      category: j.category ?? null,
      subcategory: j.subcategory ?? null,
      source: "upwork_graphql",
    }));

    console.log(`[Fetcher:GraphQL] Fetched ${jobs.length} jobs`);
    return {
      success: true,
      jobs,
      source: "upwork_graphql",
    };
  } catch (err: any) {
    console.error("[Fetcher:GraphQL] Error:", err);
    return {
      success: false,
      jobs: [],
      error: err.message || "GraphQL fetch failed",
      source: "upwork_graphql",
    };
  }
}

/**
 * Parse a budget string like "$500 Fixed" or "$15-30/hr" into numeric values.
 */
function parseBudgetString(budget: string | null): {
  budget: number | null;
  hourlyMin: number | null;
  hourlyMax: number | null;
} {
  if (!budget) return { budget: null, hourlyMin: null, hourlyMax: null };

  // Hourly range: "$15-30/hr", "$15-$30/hr" or "$4-8/hr"
  const hourlyMatch = budget.match(/\$(\d+(?:,\d+)?)\s*[-–]\s*\$?(\d+(?:,\d+)?)\s*\/hr/i);
  if (hourlyMatch) {
    return {
      budget: null,
      hourlyMin: parseFloat(hourlyMatch[1].replace(/,/g, "")),
      hourlyMax: parseFloat(hourlyMatch[2].replace(/,/g, "")),
    };
  }

  // Single hourly: "$5/hr"
  const singleHourlyMatch = budget.match(/\$(\d+(?:,\d+)?)\/hr/i);
  if (singleHourlyMatch) {
    const rate = parseFloat(singleHourlyMatch[1].replace(/,/g, ""));
    return { budget: null, hourlyMin: rate, hourlyMax: rate };
  }

  // Fixed price: "$500 Fixed" or "$2,000 Fixed" (only reachable when the
  // string carries no "/hr" suffix, so hourly jobs never land here)
  const fixedMatch = budget.match(/\$(\d+(?:,\d+)?)/);
  if (fixedMatch) {
    return {
      budget: parseFloat(fixedMatch[1].replace(/,/g, "")),
      hourlyMin: null,
      hourlyMax: null,
    };
  }

  return { budget: null, hourlyMin: null, hourlyMax: null };
}

/**
 * Generate a unique job ID from title + postedAt for dedup.
 * UpAlerts doesn't provide a unique job ID, so we hash the available fields.
 */
function generateUpalertsJobId(title: string, postedAt: string): string {
  const raw = `${title.trim().toLowerCase()}|${postedAt}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `upalerts_${Math.abs(hash).toString(36).padStart(8, "0")}`;
}

// ════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════

function capitalize(s: string): string {
  return s
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
