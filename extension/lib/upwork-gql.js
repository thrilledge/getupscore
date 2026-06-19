/**
 * UpScore — Upwork GraphQL Queries & Page-Context Fetcher
 *
 * This file runs in TWO contexts:
 *  1. Imported by content.js (background context) — provides query templates
 *  2. Injected as <script> into the page (main world) — executes fetch
 *
 * The page-context injection is CRITICAL because only the main world has
 * Cloudflare clearance + real cookies. Content scripts run in isolated world
 * and get blocked by Cloudflare Turnstile.
 */

// ═══════════════════════════════════════════════
// GRAPHQL QUERIES
// ═══════════════════════════════════════════════

/**
 * Search for jobs. This is a "visitor" query that works without login,
 * but DOES require Cloudflare clearance + some session cookies.
 */
export const VISITOR_JOB_SEARCH_QUERY = `
  query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!) {
    search {
      universalSearchNuxt {
        visitorJobSearchV1(request: $requestVariables) {
          paging {
            total
            offset
            count
          }
          facets {
            jobType { key value }
            workload { key value }
            clientHires { key value }
            durationV3 { key value }
            amount { key value }
            contractorTier { key value }
            contractToHire { key value }
          }
          results {
            id
            title
            description
            relevanceEncoded
            ontologySkills {
              uid
              parentSkillUid
              prefLabel
              freeText
              highlighted
            }
            jobTile {
              job {
                id
                ciphertext: cipherText
                jobType
                weeklyRetainerBudget
                hourlyBudgetMax
                hourlyBudgetMin
                hourlyEngagementType
                contractorTier
                sourcingTimestamp
                createTime
                publishTime
                hourlyEngagementDuration {
                  rid
                  label
                  weeks
                  mtime
                  ctime
                }
                fixedPriceAmount {
                  isoCurrencyCode
                  amount
                }
                fixedPriceEngagementDuration {
                  id
                  rid
                  label
                  weeks
                  ctime
                  mtime
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Get full job details including client info.
 */
export const VISITOR_JOB_DETAILS_QUERY = `
  query VisitorJobDetails($jobCiphertext: String!) {
    jobPubDetails {
      opening(ciphertext: $jobCiphertext) {
        status
        postedOn
        publishTime
        description
        info {
          ciphertext
          id
          type
          access
          title
          hideBudget
          createdOn
          premium
        }
        sandsData {
          occupation { uid prefLabel }
          ontologySkills { uid prefLabel relevance }
          additionalSkills { uid prefLabel relevance }
        }
        category { name urlSlug }
        budget { amount currencyCode }
        engagementDuration { label weeks }
        extendedBudgetInfo {
          hourlyBudgetMin
          hourlyBudgetMax
          hourlyBudgetType
        }
        clientActivity {
          totalApplicants
          totalHired
          totalInvitedToInterview
          numberOfPositionsToHire
        }
      }
      buyer {
        location {
          city
          country
        }
        stats {
          totalAssignments
          activeAssignmentsCount
          hoursCount
          feedbackCount
          score
          totalJobsWithHires
          totalCharges { amount }
        }
        company {
          profile { industry size }
        }
      }
      buyerExtra {
        isPaymentMethodVerified
      }
    }
  }
`;

// ═══════════════════════════════════════════════
// PAGE-CONTEXT FETCHER (injected as <script>)
// ═══════════════════════════════════════════════

/**
 * Generate the JavaScript code that runs inside the page's main world.
 * This code has FULL access to the page's cookies, fetch API, and
 * Cloudflare clearance.
 *
 * @param {string} operation - "jobSearch" | "jobDetails" | "getCookies"
 * @param {object} params - Parameters for the query
 * @returns {string} JavaScript source code to inject
 */
export function generatePageContextScript(operation, params = {}) {
  switch (operation) {

    case "getCookies":
      return `
        (function() {
          try {
            window.__upscoreCookies = document.cookie;
            window.dispatchEvent(new CustomEvent('__upscore_cookies', {
              detail: { cookies: document.cookie }
            }));
          } catch(e) {
            console.error('[UpScore] Cookie capture error:', e);
          }
        })();
      `;

    case "jobSearch":
      return `
        (function() {
          const QUERY = ${JSON.stringify(VISITOR_JOB_SEARCH_QUERY)};
          const VARIABLES = ${JSON.stringify(params)};

          fetch('https://www.upwork.com/api/graphql/v1?alias=visitorJobSearch', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Origin': 'https://www.upwork.com',
              'Referer': 'https://www.upwork.com/nx/search/jobs/',
            },
            body: JSON.stringify({ query: QUERY, variables: VARIABLES })
          })
          .then(r => r.json())
          .then(data => {
            window.dispatchEvent(new CustomEvent('__upscore_graphql_result', {
              detail: { success: true, operation: 'jobSearch', data: data, variables: VARIABLES }
            }));
          })
          .catch(err => {
            window.dispatchEvent(new CustomEvent('__upscore_graphql_result', {
              detail: { success: false, operation: 'jobSearch', error: err.message }
            }));
          });
        })();
      `;

    case "jobDetails":
      return `
        (function() {
          const QUERY = ${JSON.stringify(VISITOR_JOB_DETAILS_QUERY)};
          const CIPHER = ${JSON.stringify(params.ciphertext)};
          const ALIAS = 'gql-query-get-visitor-job-details';

          fetch('https://www.upwork.com/api/graphql/v1?alias=' + ALIAS, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Origin': 'https://www.upwork.com',
              'Referer': 'https://www.upwork.com/jobs/~' + CIPHER,
            },
            body: JSON.stringify({
              query: QUERY,
              variables: { jobCiphertext: CIPHER }
            })
          })
          .then(r => r.json())
          .then(data => {
            window.dispatchEvent(new CustomEvent('__upscore_graphql_result', {
              detail: { success: true, operation: 'jobDetails', data: data, ciphertext: CIPHER }
            }));
          })
          .catch(err => {
            window.dispatchEvent(new CustomEvent('__upscore_graphql_result', {
              detail: { success: false, operation: 'jobDetails', error: err.message }
            }));
          });
        })();
      `;

    default:
      return '';
  }
}

// ═══════════════════════════════════════════════
// RESULT NORMALIZER (runs in content script)
// ═══════════════════════════════════════════════

/**
 * Normalize a GraphQL search result into the standard job format.
 */
export function normalizeGraphQLJob(result) {
  const jobTile = result.jobTile?.job || {};
  const skills = (result.ontologySkills || []).map(s => s.prefLabel || s.freeText).filter(Boolean);

  let budget = null;
  let hourlyMin = null;
  let hourlyMax = null;
  const fpAmount = jobTile.fixedPriceAmount;
  if (fpAmount && fpAmount.amount) {
    budget = fpAmount.amount;
  }
  if (jobTile.hourlyBudgetMin || jobTile.hourlyBudgetMax) {
    hourlyMin = jobTile.hourlyBudgetMin;
    hourlyMax = jobTile.hourlyBudgetMax;
  }

  return {
    job_id: result.ciphertext || result.cipherText || jobTile.ciphertext || result.id || '',
    title: (result.title || '').slice(0, 500),
    description: (result.description || '').slice(0, 10000),
    url: `https://www.upwork.com/jobs/~${result.ciphertext || result.id || ''}`,
    skills,
    budget: budget ? `$${budget}` : '',
    hourly_min: hourlyMin,
    hourly_max: hourlyMax,
    country: '',
    proposals_count: 0, // Only available from details query
    posted_at: jobTile.createTime || jobTile.publishTime || '',
    client_info: '',
    payment_verified: false,
    captured_at: new Date().toISOString(),
    source: 'graphql_search',
    synced: false,
  };
}
