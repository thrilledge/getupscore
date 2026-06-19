/**
 * UpScore — Main World Bridge
 *
 * Injected as <script src="chrome-extension://<id>/lib/main-world.js">
 * This runs in the page's MAIN world where Cloudflare cookies and
 * clearance are available. CSP allows chrome-extension:// URLs.
 *
 * Communication:
 *   Content script → postMessage({type:'__upscore_exec',...}) → this script
 *   This script    → CustomEvent('__upscore_graphql_result'|'__upscore_cookies') → content script
 */

(function () {
  // Guard: don't register twice
  if (window.__upscoreBridgeLoaded) return;
  window.__upscoreBridgeLoaded = true;

  const GRAPHQL_URL = "https://www.upwork.com/api/graphql/v1";

  const QUERIES = {
    jobSearch: `query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!) { search { universalSearchNuxt { visitorJobSearchV1(request: $requestVariables) { paging { total offset count } facets { jobType { key value } workload { key value } clientHires { key value } durationV3 { key value } amount { key value } contractorTier { key value } contractToHire { key value } } results { id title description relevanceEncoded ontologySkills { uid parentSkillUid prefLabel freeText highlighted } jobTile { job { id ciphertext: cipherText jobType weeklyRetainerBudget hourlyBudgetMax hourlyBudgetMin hourlyEngagementType contractorTier sourcingTimestamp createTime publishTime hourlyEngagementDuration { rid label weeks mtime ctime } fixedPriceAmount { isoCurrencyCode amount } fixedPriceEngagementDuration { id rid label weeks ctime mtime } } } } } } }`,

    jobDetails: `query VisitorJobDetails($jobCiphertext: String!) { jobPubDetails { opening(ciphertext: $jobCiphertext) { status postedOn publishTime description info { ciphertext id type access title hideBudget createdOn premium } sandsData { occupation { uid prefLabel } ontologySkills { uid prefLabel relevance } additionalSkills { uid prefLabel relevance } } category { name urlSlug } budget { amount currencyCode } hiringOdbc { uid name } attachments { name type } client { name feedback visibility location { city country } company { name size url } } buyer { location { city country } stats { totalAssignments activeAssignmentsCount hoursCount feedbackCount score totalJobsWithHires totalCharges { amount } } company { profile { industry size } } } buyerExtra { isPaymentMethodVerified } } } }`,
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== "__upscore_exec") return;

    const { operation, params } = event.data;

    switch (operation) {
      case "getCookies":
        window.dispatchEvent(
          new CustomEvent("__upscore_cookies", {
            detail: { cookies: document.cookie },
          })
        );
        break;

      case "jobSearch":
        {
          const query = params?.query || QUERIES.jobSearch;
          const variables = params?.variables || {};
          fetch(GRAPHQL_URL + "?alias=visitorJobSearch", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Origin: "https://www.upwork.com",
              Referer: "https://www.upwork.com/nx/search/jobs/",
            },
            body: JSON.stringify({ query, variables }),
          })
            .then((r) => r.json())
            .then((data) => {
              window.dispatchEvent(
                new CustomEvent("__upscore_graphql_result", {
                  detail: {
                    success: true,
                    operation: "jobSearch",
                    data,
                    variables,
                  },
                })
              );
            })
            .catch((err) => {
              window.dispatchEvent(
                new CustomEvent("__upscore_graphql_result", {
                  detail: {
                    success: false,
                    operation: "jobSearch",
                    error: err.message,
                  },
                })
              );
            });
        }
        break;

      case "jobDetails":
        {
          const ciphertext = params?.ciphertext || "";
          fetch(
            GRAPHQL_URL + "?alias=gql-query-get-visitor-job-details",
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Origin: "https://www.upwork.com",
                Referer:
                  "https://www.upwork.com/jobs/~" + ciphertext,
              },
              body: JSON.stringify({
                query: QUERIES.jobDetails,
                variables: { jobCiphertext: ciphertext },
              }),
            }
          )
            .then((r) => r.json())
            .then((data) => {
              window.dispatchEvent(
                new CustomEvent("__upscore_graphql_result", {
                  detail: {
                    success: true,
                    operation: "jobDetails",
                    data,
                    ciphertext,
                  },
                })
              );
            })
            .catch((err) => {
              window.dispatchEvent(
                new CustomEvent("__upscore_graphql_result", {
                  detail: {
                    success: false,
                    operation: "jobDetails",
                    error: err.message,
                  },
                })
              );
            });
        }
        break;
    }
  });
})();
