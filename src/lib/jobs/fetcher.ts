/**
 * Job Fetcher — Provider-based system for fetching jobs from Upwork.
 *
 * Providers:
 *  - mock: Returns sample jobs for development/testing
 *  - apify: Uses Apify's Upwork Jobs Scraper actor
 *  - playwright: Direct Playwright browser (for VPS deployment)
 *
 * Set JOB_FETCHER_PROVIDER=mock|apify|playwright in .env.local
 */

import { env } from "@/lib/env";
import type { JobInsert } from "@/lib/supabase/database-types";

// ─── Types ───

export interface FetcherJob {
  upwork_job_id: string;
  title: string;
  description?: string;
  url?: string;
  budget?: number | null;
  hourly_min?: number | null;
  hourly_max?: number | null;
  client_country?: string | null;
  proposals_count?: number | null;
  posted_at?: string | null;
  skills?: string[];
  client_name?: string;
  payment_verified?: boolean;
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
    client_country: j.client_country?.slice(0, 100) || null,
    proposals_count: j.proposals_count ?? null,
    posted_at: j.posted_at || null,
  }));
}

// ════════════════════════════════════════════════════════════
// Provider: Mock (for dev/testing)
// ════════════════════════════════════════════════════════════

async function fetchMock(query?: string): Promise<FetchResult> {
  const searchQuery = query || "react developer";

  console.log(`[Fetcher:Mock] Generating mock jobs for "${searchQuery}"`);

  const mockJobs: FetcherJob[] = [
    {
      upwork_job_id: `mock_${Date.now()}_1`,
      title: `Senior ${capitalize(searchQuery)} — Full Time`,
      description: `We are looking for an experienced ${searchQuery} to join our team. You will be working on cutting-edge projects with modern technologies. Must have 5+ years of experience.\n\nRequirements:\n- Strong knowledge of ${searchQuery}\n- Experience with TypeScript, React, Node.js\n- Good communication skills\n- Ability to work independently`,
      url: "https://www.upwork.com/jobs/~mock1",
      budget: 5000,
      client_country: "United States",
      proposals_count: 8,
      posted_at: new Date(Date.now() - 3600000).toISOString(),
      skills: ["React", "TypeScript", "Node.js", "GraphQL"],
      client_name: "TechCorp Inc.",
      payment_verified: true,
    },
    {
      upwork_job_id: `mock_${Date.now()}_2`,
      title: `${capitalize(searchQuery)} for Exciting Startup Project`,
      description: `We are a funded startup looking for a talented ${searchQuery} developer to build our MVP. This is a long-term opportunity with equity potential.\n\nScope:\n- Build web application from scratch\n- Implement responsive UI\n- Set up CI/CD pipeline\n- Deploy to production`,
      url: "https://www.upwork.com/jobs/~mock2",
      hourly_min: 40,
      hourly_max: 65,
      client_country: "United Kingdom",
      proposals_count: 22,
      posted_at: new Date(Date.now() - 7200000).toISOString(),
      skills: ["React", "Next.js", "Tailwind CSS", "PostgreSQL"],
      client_name: "StartupXYZ",
      payment_verified: true,
    },
    {
      upwork_job_id: `mock_${Date.now()}_3`,
      title: `Urgent: Bug Fixes & ${capitalize(searchQuery)} Maintenance`,
      description: `Need help fixing bugs and maintaining our ${searchQuery} codebase. Small tasks but consistent work available.\n\nTasks:\n- Fix UI bugs\n- Optimize performance\n- Add small features\n- Code review`,
      url: "https://www.upwork.com/jobs/~mock3",
      hourly_min: 25,
      hourly_max: 40,
      client_country: "Canada",
      proposals_count: 45,
      posted_at: new Date(Date.now() - 18000000).toISOString(),
      skills: ["React", "JavaScript", "CSS"],
      client_name: "WebAgency",
      payment_verified: false,
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
      description: item.description || item.body || "",
      url: item.url || `https://www.upwork.com/jobs/~${item.jobId}`,
      budget: item.budget?.amount ? parseFloat(item.budget.amount) : null,
      hourly_min: item.hourlyMin || null,
      hourly_max: item.hourlyMax || null,
      client_country: item.client?.country || item.country || null,
      proposals_count: item.proposalsCount || null,
      posted_at: item.publishedDate || item.createdAt || null,
      skills: item.skills || [],
      client_name: item.client?.name || null,
      payment_verified: item.client?.paymentVerified || false,
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
