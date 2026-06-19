/**
 * Upwork GraphQL Fetcher — Server-side 24/7 job fetcher.
 *
 * Uses ScrapingAnt proxy + stored session cookies to call Upwork's
 * GraphQL API. Cookies are provided by the Chrome Extension's
 * content script (page-context), which captures them from the
 * user's actual browsing session.
 *
 * Why ScrapingAnt + cookies?
 *  - Upwork blocks direct server connections (Cloudflare Turnstile)
 *  - The GraphQL API requires session cookies even for "visitor" searches
 *  - ScrapingAnt proxies the request through their infrastructure
 *  - Cookies provide the Cloudflare clearance + Upwork session
 *
 * Architecture:
 *   Extension (when browser open) → captures cookies → syncs to server
 *   Vercel Cron (every 30 min) → fetches cookies → ScrapingAnt → GraphQL → DB
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";

const SCRAPINGANT_API_BASE = "https://api.scrapingant.com/v2/general";
const UPWORK_GRAPHQL_BASE = "https://www.upwork.com/api/graphql/v1";

// ═══════════════════════════════════════════════════
// GRAPHQL QUERIES
// ═══════════════════════════════════════════════════

const VISITOR_JOB_SEARCH_QUERY = `
  query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!) {
    search {
      universalSearchNuxt {
        visitorJobSearchV1(request: $requestVariables) {
          paging { total offset count }
          results {
            id
            title
            description
            ontologySkills { uid prefLabel freeText highlighted }
            jobTile {
              job {
                id
                ciphertext: cipherText
                jobType
                hourlyBudgetMax
                hourlyBudgetMin
                contractorTier
                createTime
                publishTime
                hourlyEngagementDuration { label weeks }
                fixedPriceAmount { isoCurrencyCode amount }
              }
            }
          }
        }
      }
    }
  }
`;

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface FetchedJob {
  upwork_job_id: string;
  title: string;
  description: string | null;
  url: string;
  budget: number | null;
  hourly_min: number | null;
  hourly_max: number | null;
  client_country: string | null;
  proposals_count: number | null;
  skills: string[];
  posted_at: string | null;
}

export interface GraphQLFetchResult {
  jobs: FetchedJob[];
  totalResults: number;
  queryUsed: string;
  source: string;
}

// ═══════════════════════════════════════════════════
// MAIN FETCHER
// ═══════════════════════════════════════════════════

/**
 * Fetch jobs from Upwork's GraphQL API via ScrapingAnt proxy.
 *
 * @param options.query - Search query (e.g., "react developer")
 * @param options.cookies - Upwork session cookies
 * @param options.count - Number of results per page
 * @param options.offset - Pagination offset
 * @returns Parsed job results
 */
export async function fetchJobsViaGraphQL(options: {
  query: string;
  cookies: string;
  count?: number;
  offset?: number;
}): Promise<GraphQLFetchResult> {
  const { query, cookies, count = 10, offset = 0 } = options;
  const apiKey = process.env.SCRAPINGANT_API_KEY;

  if (!apiKey) {
    throw new Error(
      "SCRAPINGANT_API_KEY not configured. " +
      "Add it to .env.local or use the extension for job capture."
    );
  }

  const variables = {
    requestVariables: {
      userQuery: query,
      sort: "recency+desc",
      highlight: false,
      paging: { offset, count },
    },
  };

  const graphqlUrl = `${UPWORK_GRAPHQL_BASE}?alias=visitorJobSearch`;
  const encodedUrl = encodeURIComponent(graphqlUrl);
  const scrapingAntUrl = `${SCRAPINGANT_API_BASE}?url=${encodedUrl}&x-api-key=${apiKey}&browser=false`;

  console.log(`[GraphQL Fetcher] Searching: "${query}" (offset=${offset}, count=${count})`);

  const response = await fetch(scrapingAntUrl, {
    method: "POST",
    headers: {
      "Ant-Content-Type": "application/json",
      "Ant-Header-Accept": "*/*",
      "Ant-Header-Accept-Language": "en-US,en;q=0.9",
      "Ant-Header-Origin": "https://www.upwork.com",
      "Ant-Header-Referer": "https://www.upwork.com/nx/search/jobs/",
      "Ant-Header-User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Ant-Header-Sec-Fetch-Site": "same-origin",
      "Ant-Header-Sec-Fetch-Mode": "cors",
      "Ant-Cookies": cookies,
    },
    body: JSON.stringify({
      query: VISITOR_JOB_SEARCH_QUERY,
      variables,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "No body");
    throw new Error(`ScrapingAnt returned ${response.status}: ${text.slice(0, 200)}`);
  }

  // Parse response (ScrapingAnt returns HTML with JSON embedded)
  const html = await response.text();
  const data = extractJsonFromScrapingAntResponse(html);

  if (!data) {
    throw new Error("Failed to parse GraphQL response from ScrapingAnt");
  }

  // Check for GraphQL errors
  if (data.errors) {
    const messages = data.errors.map((e: any) => e.message).join("; ");
    // If auth failed, cookies may have expired
    if (messages.includes("Authentication failed")) {
      throw new Error("UPWORK_AUTH_EXPIRED: Session cookies are invalid. Open Upwork in your browser to refresh them.");
    }
    throw new Error(`GraphQL error: ${messages}`);
  }

  // Extract results
  const results =
    data?.data?.search?.universalSearchNuxt?.visitorJobSearchV1?.results || [];
  const total =
    data?.data?.search?.universalSearchNuxt?.visitorJobSearchV1?.paging?.total || 0;

  const jobs = results.map(normalizeGraphQLResult).filter(Boolean) as FetchedJob[];

  return {
    jobs,
    totalResults: total,
    queryUsed: query,
    source: "graphql_server",
  };
}

/**
 * Fetch stored cookies from the database, then fetch jobs for a given query.
 */
export async function fetchJobsForUser(options: {
  userId: string;
  query: string;
  count?: number;
  offset?: number;
}): Promise<GraphQLFetchResult> {
  const supabase = await createSupabaseAdminClient();

  const { data: session, error } = await supabase
    .from("upwork_sessions")
    .select("cookie_string")
    .eq("user_id", options.userId)
    .maybeSingle();

  if (error || !session?.cookie_string) {
    throw new Error(
      "No Upwork session found for this user. " +
      "Open Upwork in your browser and ensure the extension is active."
    );
  }

  return fetchJobsViaGraphQL({
    query: options.query,
    cookies: session.cookie_string,
    count: options.count,
    offset: options.offset,
  });
}

// ═══════════════════════════════════════════════════
// REFRESH COOKIES (check if they need refresh)
// ═══════════════════════════════════════════════════

/**
 * Check if stored cookies are still valid by making a small test query.
 * Returns true if valid, false if expired.
 */
export async function validateSessionCookies(userId: string): Promise<boolean> {
  try {
    await fetchJobsForUser({ userId, query: "test", count: 1 });
    return true;
  } catch (err: any) {
    if (err.message?.includes("UPWORK_AUTH_EXPIRED")) {
      return false;
    }
    // Other errors (network, etc.) — assume cookies might still be valid
    return true;
  }
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

/**
 * ScrapingAnt returns HTML-wrapped JSON. Extract the JSON part.
 * Format: <html><body><pre>{...json...}</pre></body></html>
 */
function extractJsonFromScrapingAntResponse(html: string): any {
  try {
    // Look for JSON inside <pre> tags
    const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/);
    if (preMatch) {
      return JSON.parse(preMatch[1]);
    }
    // Try parsing whole response as JSON
    return JSON.parse(html);
  } catch {
    return null;
  }
}

/**
 * Normalize a GraphQL search result into the standard job format.
 */
function normalizeGraphQLResult(result: any): FetchedJob | null {
  if (!result || !result.title) return null;

  const jobTile = result.jobTile?.job || {};
  const ciphertext = result.ciphertext || result.cipherText || jobTile.ciphertext || result.id || "";
  if (!ciphertext) return null;

  const skills = (result.ontologySkills || [])
    .map((s: any) => s.prefLabel || s.freeText)
    .filter(Boolean);

  const fpAmount = jobTile.fixedPriceAmount;
  let budget: number | null = null;
  if (fpAmount?.amount) {
    budget = typeof fpAmount.amount === "number" ? fpAmount.amount : parseFloat(fpAmount.amount);
  }

  return {
    upwork_job_id: ciphertext,
    title: (result.title || "").slice(0, 500),
    description: (result.description || "").slice(0, 10000) || null,
    url: `https://www.upwork.com/jobs/~${ciphertext}`,
    budget,
    hourly_min: jobTile.hourlyBudgetMin ?? null,
    hourly_max: jobTile.hourlyBudgetMax ?? null,
    client_country: null,
    proposals_count: null,
    skills,
    posted_at: jobTile.publishTime || jobTile.createTime || null,
  };
}

/**
 * Convert FetchedJob to a job record for DB upsert.
 */
export function toJobInsert(job: FetchedJob) {
  return {
    upwork_job_id: job.upwork_job_id,
    title: job.title,
    description: job.description,
    url: job.url,
    budget: job.budget,
    hourly_min: job.hourly_min,
    hourly_max: job.hourly_max,
    client_country: job.client_country,
    proposals_count: job.proposals_count,
    posted_at: job.posted_at ? new Date(job.posted_at).toISOString() : null,
  };
}
