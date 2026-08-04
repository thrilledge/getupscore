(function () {
  if (window.__upscoreBridgeLoaded) return;
  window.__upscoreBridgeLoaded = true;

  // ─── Intercept fetch to capture Upwork's own GraphQL responses ───
  const originalFetch = window.fetch.bind(window);
  window.fetch = function (...args) {
    const requestUrl = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    const requestBody = typeof args[1]?.body === "string" ? args[1].body : "";

    return originalFetch.apply(this, args).then(async (response) => {
      if (response.status !== 200) return response;

      // Always let through - we only observe, don't block
      if (!requestUrl.includes("api/") && !requestUrl.includes("graphql") && !requestUrl.includes("gql")) return response;
      if (requestUrl.includes("__upscore_fetch")) return response;

      const cloned = response.clone();
      try {
        const text = await cloned.text();
        try {
          const json = JSON.parse(text);

          // Specifically intercept gql-query-get-visitor-job-details
          if (requestUrl.includes("visitor-job-details") || requestUrl.includes("VisitorJobDetails") || requestBody.includes("VisitorJobDetails")) {
            if (json?.data?.jobPubDetails) {
              const job = normalizeJobData(json.data.jobPubDetails);
              if (job && job.title) {
                job._source = "api-interceptor";
                window.postMessage({
                  type: "__upscore_result",
                  operation: "jobDetails",
                  success: true,
                  data: job,
                }, "*");
              }
            }
          }

          // Look for profile-like data
          if ((text.includes("talentVPDAuthProfile") || text.includes('"profile"')) && text.includes("skills")) {
            if (json?.data?.talentVPDAuthProfile) {
              window.postMessage({
                type: "__upscore_result",
                operation: "profileDetail",
                success: true,
                data: json,
              }, "*");
              return response;
            }
            if (json?.data) {
              for (const key of Object.keys(json.data)) {
                const val = json.data[key];
                if (val && typeof val === "object" && (val.profile?.title || val.title) && val.skills) {
                  window.postMessage({
                    type: "__upscore_result",
                    operation: "profileDetail",
                    success: true,
                    data: { data: { talentVPDAuthProfile: val } },
                  }, "*");
                  break;
                }
              }
            }
          }
          // Look for job-like data in GraphQL responses — use recursive findJobInJson
          if (json?.data) {
            const foundJob = findJobInJson(json);
            if (foundJob) {
              const job = normalizeJobData(foundJob);
              if (job) {
                window.postMessage({
                  type: "__upscore_result",
                  operation: "jobDetails",
                  success: true,
                  data: job,
                }, "*");
                return response;
              }
            }
          }

          // Talent search responses carry the total freelancer count
          if (requestUrl.includes("search/talent") || /talentSearch|TalentSearch|searchFreelancers/.test(requestBody)) {
            const talentCount = findFreelancerCountInJson(json, 0);
            if (talentCount != null) {
              window.postMessage({
                type: "__upscore_result",
                operation: "talentSearchCount",
                success: true,
                data: {
                  skill: getSkillFromTalentUrl().slice(0, 200),
                  freelancerCount: talentCount,
                },
              }, "*");
            }
          }
        } catch { /* ignore */ }
      } catch { /* ignore */ }

      return response;
    });
  };

  // ─── Also intercept XMLHttpRequest ───
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__upscoreUrl = typeof url === "string" ? url : (url || "").toString();
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    const xhr = this;
    if (xhr.__upscoreUrl?.includes("api/") || xhr.__upscoreUrl?.includes("graphql")) {
      xhr.addEventListener("load", function () {
        try {
          const text = xhr.responseText;
          const json = JSON.parse(text);
          if (!json || !json.data) return;

          // Profile
          if ((text.includes("talentVPDAuthProfile") || text.includes('"profile"')) && text.includes("skills")) {
            if (json?.data?.talentVPDAuthProfile) {
              window.postMessage({
                type: "__upscore_result",
                operation: "profileDetail",
                success: true,
                data: json,
              }, "*");
            } else {
              for (const key of Object.keys(json.data)) {
                const val = json.data[key];
                if (val && typeof val === "object" && (val.profile?.title || val.title) && val.skills) {
                  window.postMessage({
                    type: "__upscore_result",
                    operation: "profileDetail",
                    success: true,
                    data: { data: { talentVPDAuthProfile: val } },
                  }, "*");
                  break;
                }
              }
            }
          }

          // Job — use recursive findJobInJson
          if (json?.data) {
            const foundJob = findJobInJson(json);
            if (foundJob) {
              const job = normalizeJobData(foundJob);
              if (job) {
                window.postMessage({
                  type: "__upscore_result",
                  operation: "jobDetails",
                  success: true,
                  data: job,
                }, "*");
              }
            }
          }
        } catch { /* ignore */ }
      });
    }
    return origSend.apply(this, arguments);
  };

  // ─── Listen for manual EXTRACT_PAGE triggers ───
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== "__upscore_exec") return;

    const { operation } = event.data;

    switch (operation) {
      case "getProfileFromDom":
        tryExtractWithRetry(0);
        break;
      case "getJobDetailsFromDom":
        tryExtractJobWithRetry(0);
        break;
      case "insertPortfolioOnApply":
        insertPortfolioOnApplyPage(event.data?.params?.portfolio);
        break;
      case "fetchJobFromApi":
        fetchJobDetailsFromUpworkApi(event.data?.params?.ciphertext, event.data?.params?.token);
        break;
      case "getTalentSearchCount":
        tryExtractTalentCountWithRetry(0);
        break;
    }
  });

  function tryExtractWithRetry(attempt) {
    const profile = extractProfileFromDom();
    const pv = window.__NUXT__?.state?.profileViewer;
    const portfolio = pv?.portfolioV2 ?? null;
    const portfolioReady = portfolio && portfolio.isLoading === false;
    const hasPortfolioItems = portfolioReady && (
      (Array.isArray(portfolio.publishedCurrentPageProjects) && portfolio.publishedCurrentPageProjects.length > 0) ||
      (Array.isArray(portfolio.draftCurrentPageProjects) && portfolio.draftCurrentPageProjects.length > 0)
    );

    if (profile && (hasPortfolioItems || attempt >= 10)) {
      window.postMessage({
        type: "__upscore_result",
        operation: "profileDetail",
        success: true,
        data: {
          data: {
            talentVPDAuthProfile: profile,
            portfolioV2: portfolio,
          },
        },
      }, "*");
      return;
    }

    // If portfolio or profile is still loading, wait (up to 15s)
    const stillWaiting = (portfolio?.isLoading === true) || (pv?.loadedDetails === false);
    if (stillWaiting && attempt < 15) {
      setTimeout(() => tryExtractWithRetry(attempt + 1), 1000);
      return;
    }

    // Fallback: send what we have after all retries
    if (profile) {
      window.postMessage({
        type: "__upscore_result",
        operation: "profileDetail",
        success: true,
        data: {
          data: {
            talentVPDAuthProfile: profile,
            portfolioV2: portfolio,
          },
        },
      }, "*");
      return;
    }

    window.postMessage({
      type: "__upscore_result",
      operation: "profileDetail",
      success: false,
      error: "Could not extract profile from DOM",
    }, "*");
  }

  function extractProfileFromDom() {
    return (
      extractFromNuxt() ||
      extractFromVueApp() ||
      extractFromScripts() ||
      extractFromSelectors()
    );
  }

  /** Method 1: Nuxt __NUXT__ state */
  function extractFromNuxt() {
    try {
      const nuxt = window.__NUXT__;
      if (!nuxt) {
        return null;
      }

      if (nuxt.state) {
        // Direct extraction from known state keys
        const pv = nuxt.state.profileViewer;
        if (pv) {
          // profileViewer.profile is the freelancer profile
          if (pv.profile) {
            return pv.profile;
          }
          // profileViewer.person contains user info
          if (pv.person) {
            return pv.person;
          }
          // Fallback: deep search profileViewer
          const found = findProfileInJson(pv);
          if (found) return found;
        }
      }
    } catch { }
    return null;
  }

  /** Method 2: Vue app root component */
  function extractFromVueApp() {
    try {
      const appRoot = document.getElementById("__nuxt") || document.getElementById("app");
      if (!appRoot) {
        const allIds = Array.from(document.querySelectorAll("[id]")).map(el => el.id).join(", ");
        return null;
      }

      const vue = appRoot.__vue__;
      if (!vue) return null;

      // Traverse Vue component tree for profile data
      let profile = null;
      function walk(component) {
        if (!component || component.__upscoreVisited) return;
        component.__upscoreVisited = true;
        try {
          const state = component.$store?.state;
          if (state) {
            profile = profile || findProfileInJson(state);
          }
        } catch { /* ignore */ }
        try {
          if (component.$children) {
            component.$children.forEach(walk);
          }
        } catch { /* ignore */ }
      }
      walk(vue);
      return profile;
    } catch { /* ignore */ }
    return null;
  }

  /** Method 3: Scan script tags - try JSON parse first, then string extraction */
  function extractFromScripts() {
    for (const script of document.querySelectorAll("script")) {
      const text = script.textContent || "";
      if (text.includes("talentVPDAuthProfile")) {
        // Try to extract the profile object from JavaScript code
        const match = text.match(/talentVPDAuthProfile\s*[=:]\s*(\{[\s\S]*?\})\s*[;}]/);
        if (match) {
          try {
            const profile = JSON.parse(match[1]);
            return profile;
          } catch { /* not plain JSON */ }
        }
        // Try finding complete object after talentVPDAuthProfile
        const idx = text.indexOf("talentVPDAuthProfile");
        const slice = text.slice(idx + "talentVPDAuthProfile".length);
        const objMatch = slice.match(/[=:]\s*(\{[\s\S]*?\})\s*[;,\]\}]/);
        if (objMatch) {
          try {
            const profile = JSON.parse(objMatch[1]);
            return profile;
          } catch { /* not plain JSON */ }
        }
      }
      if (text.includes("__NUXT__")) {
        const nuxtIdx2 = text.indexOf("window.__NUXT__");
        let nuxtMatch = null;
        if (nuxtIdx2 !== -1) {
          const slice = text.slice(nuxtIdx2);
          let braceCount = 0;
          let start = -1;
          for (let i = 0; i < slice.length; i++) {
            if (slice[i] === '{') { if (start === -1) start = i; braceCount++; }
            else if (slice[i] === '}') { braceCount--; if (braceCount === 0 && start !== -1) { nuxtMatch = [null, slice.slice(start, i + 1)]; break; } }
          }
        }
        if (nuxtMatch) {
          try {
            const nuxt = JSON.parse(nuxtMatch[1]);
            return findProfileInJson(nuxt);
          } catch { /* not plain JSON */ }
        }
      }
    }
    // Fallback: search all JSON-like objects in all script tags
    for (const script of document.querySelectorAll("script")) {
      const text = script.textContent || "";
      if (text.includes("profile") && (text.includes("skills") || text.includes("hourly"))) {
        try {
          const json = JSON.parse(text);
          const profile = findProfileInJson(json);
          if (profile) {
            return profile;
          }
        } catch { /* not JSON */ }
      }
    }
    return null;
  }

  /** Method 4: Rendered DOM selectors */
  function extractFromSelectors() {
    try {
      const profile = {};

      // Try microdata / schema.org
      const ldJson = document.querySelector('script[type="application/ld+json"]');
      if (ldJson) {
        try {
          const ld = JSON.parse(ldJson.textContent);
          if (ld.name) profile.title = ld.name;
          if (ld.description) profile.description = ld.description;
          if (ld.knowsAbout) {
            profile.skills = (Array.isArray(ld.knowsAbout) ? ld.knowsAbout : [ld.knowsAbout])
              .map((s) => s.name || s)
              .filter(Boolean)
              .map((name) => ({ node: { prettyName: name } }));
          }
        } catch { /* ignore */ }
      }

      // Generic selectors — try visible text
      const h1 = document.querySelector("h1");
      if (h1 && !profile.title) profile.title = h1.textContent?.trim();

      // Rate
      const air = document.querySelector('[data-qa="air"]');
      if (air) {
        const rateMatch = air.textContent.match(/\$[\d.]+/);
        if (rateMatch) profile.hourlyRate = { node: { amount: parseFloat(rateMatch[0].replace("$", "")) } };
      }

      // Location
      const locationItem = document.querySelector('[data-qa="location"]');
      if (locationItem) {
        profile.location = { country: locationItem.textContent?.trim() || "" };
      }

      // Stats section
      const statLabels = document.querySelectorAll('[data-qa="stat-label"]');
      const statValues = document.querySelectorAll('[data-qa="stat-value"]');
      if (statLabels.length > 0) {
        for (let i = 0; i < statLabels.length; i++) {
          const label = statLabels[i]?.textContent?.toLowerCase() || "";
          const value = statValues[i]?.textContent?.trim() || "";
          const numMatch = value.match(/[\d,.]+/);
          const num = numMatch ? parseFloat(numMatch[0].replace(/,/g, "")) : NaN;

          if (label.includes("earnings") && !isNaN(num)) profile.totalEarnings = num;
          if (label.includes("job") && !isNaN(num)) profile.totalJobsWorked = num;
          if (label.includes("hour") && !isNaN(num)) profile.totalHoursActual = num;
          if (label.includes("rating") && !isNaN(num)) profile.rating = num;
        }
      }

      // Skills
      const skillLinks = document.querySelectorAll('a[data-qa^="skill"]');
      if (skillLinks.length > 0) {
        profile.skills = Array.from(skillLinks)
          .map((a) => a.textContent?.trim())
          .filter(Boolean)
          .map((name) => ({ node: { prettyName: name } }));
      }

      if (profile.title || (profile.description && profile.description.length > 10)) {
        return profile;
      }
    } catch { /* ignore */ }
    return null;
  }

  function findProfileInJson(json, _depth = 0) {
    if (!json || typeof json !== "object" || _depth > 20) return null;
    if (json.talentVPDAuthProfile) return json.talentVPDAuthProfile;
    if (json.profile?.talentVPDAuthProfile) return json.profile.talentVPDAuthProfile;
    if (json.state?.talentVPDAuthProfile) return json.state.talentVPDAuthProfile;
    if (json.data?.talentVPDAuthProfile) return json.data.talentVPDAuthProfile;
    if (json.props?.pageProps?.talentVPDAuthProfile) return json.props.pageProps.talentVPDAuthProfile;

    // Direct profile-shaped objects
    if (isProfileShape(json)) return json;

    // Apollo cache entries
    for (const key of Object.keys(json)) {
      if (typeof json[key] === "object" && json[key] !== null) {
        const found = findProfileInJson(json[key], _depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  function isProfileShape(obj) {
    if (!obj || typeof obj !== "object") return false;
    const hasTitle = typeof obj.title === "string" && obj.title.length > 0;
    const hasSkills = Array.isArray(obj.skills) || typeof obj.skills === "object";
    const hasDesc = typeof obj.description === "string" && obj.description.length > 10;
    return hasTitle && (hasSkills || hasDesc);
  }

  // ─── JOB EXTRACTION ───

  let pendingPartialJob = null;

  function tryExtractJobWithRetry(attempt) {
    if (attempt === 0) {
      pendingPartialJob = null;
      // Click "more" buttons to expand truncated feedback text
      const moreBtns = document.querySelectorAll('.air3-truncation-btn[aria-expanded="false"]');
      if (moreBtns.length > 0) {
        moreBtns.forEach(btn => btn.click());
        // Wait one frame for Vue to update DOM, then extract
        requestAnimationFrame(() => tryExtractJobWithRetry(attempt));
        return;
      }
      const nuxt = window.__NUXT__;
      if (nuxt?.state) {
        for (const key of Object.keys(nuxt.state)) {
          const val = nuxt.state[key];
          if (val && typeof val === "object") {
            const subKeys = Object.keys(val);
            if (subKeys.length > 0 && subKeys.length < 10) {
            }
          }
        }
      }
    }

    // Wait at least 4 attempts (~6s total) before accepting a result without history
    const minAttemptsForPartial = 4;
    const job = extractJobFromDom();

    // On the apply page the sidebar (.fe-job-details) is the authoritative source —
    // it renders server-side with the page, so accept it immediately and never let
    // Nuxt/Vue portfolio objects override it.
    if (job?._source === "apply-dom") {
      window.__upscoreLastJob = job;
      window.postMessage({
        type: "__upscore_result",
        operation: "jobDetails",
        success: true,
        data: job,
      }, "*");
      pendingPartialJob = null;
      return;
    }

    if (job) {
      const hasHistory = job.client_recent_history && job.client_recent_history.length > 0;
      if (hasHistory || attempt >= minAttemptsForPartial) {
        if (pendingPartialJob && !hasHistory) {
          if (!job.client_recent_history) job.client_recent_history = pendingPartialJob.client_recent_history;
        }
        window.__upscoreLastJob = job;
        window.postMessage({
          type: "__upscore_result",
          operation: "jobDetails",
          success: true,
          data: job,
        }, "*");
        pendingPartialJob = null;
        return;
      }
      // Partial result with no history yet — save and retry
      pendingPartialJob = job;
    }

    const nuxtJob = window.__NUXT__?.state?.jobViewer?.job || window.__NUXT__?.state?.job;
    if (!nuxtJob && attempt < 20) {
      setTimeout(() => tryExtractJobWithRetry(attempt + 1), 1000);
      return;
    }

    if (nuxtJob) {
      const jobData = normalizeJobData(nuxtJob);
      if (pendingPartialJob) {
        Object.assign(pendingPartialJob, jobData);
        jobData.client_recent_history = pendingPartialJob.client_recent_history;
      }
      window.postMessage({
        type: "__upscore_result",
        operation: "jobDetails",
        success: true,
        data: jobData,
      }, "*");
      pendingPartialJob = null;
      return;
    }

    if (attempt >= 20) {
    }

    // Send whatever partial result we have as a last resort
    const finalJob = pendingPartialJob || job;
    if (finalJob && finalJob.title) {
      window.postMessage({
        type: "__upscore_result",
        operation: "jobDetails",
        success: true,
        data: finalJob,
      }, "*");
    } else {
      window.postMessage({
        type: "__upscore_result",
        operation: "jobDetails",
        success: false,
        error: "Could not extract job from DOM",
      }, "*");
    }
    pendingPartialJob = null;
  }

  function extractJobFromApplyPage() {
    try {
      const container = document.querySelector(".fe-job-details");
      if (!container) return null;

      const job = {};
      const matched = [];

      const titleEl = container.querySelector(".content h3");
      if (titleEl) { job.title = titleEl.textContent?.trim(); matched.push("title"); }

      const postedEl = container.querySelector('[itemprop="datePosted"]');
      if (postedEl) { job.posted_at = postedEl.textContent?.trim(); matched.push("posted_at"); }

      const descEl = container.querySelector(".description.text-body-sm");
      if (descEl) {
        const desc = descEl.textContent?.trim();
        if (desc && desc.length > 40) { job.description = desc; matched.push("description"); }
      }

      const durationEl = container.querySelector('[data-test="hourly-duration"]');
      if (durationEl) {
        const txt = durationEl.textContent || "";
        const range = txt.match(/\$([\d,]+(?:\.\d+)?)\s*[-–]\s*\$([\d,]+(?:\.\d+)?)/);
        if (range) {
          job.hourly_min = parseFloat(range[1].replace(",", ""));
          job.hourly_max = parseFloat(range[2].replace(",", ""));
          job.budget_type = "hourly";
          matched.push("budget");
        }
      }

      const clientsBudget = container.querySelector(".clients-budget");
      if (clientsBudget) {
        const txt = clientsBudget.textContent || "";
        const range = txt.match(/\$([\d,]+(?:\.\d+)?)\s*[-–]\s*\$([\d,]+(?:\.\d+)?)/);
        if (range) {
          job.hourly_min = parseFloat(range[1].replace(",", ""));
          job.hourly_max = parseFloat(range[2].replace(",", ""));
          job.budget_type = "hourly";
          matched.push("clients_budget");
        }
      }

      job.url = window.location.href;
      job._source = "apply-dom";

      if (job.title && (job.description || matched.includes("budget"))) return job;
      return null;
    } catch {
      return null;
    }
  }

  function extractJobFromDom() {
    // On the apply page the job lives in the sidebar (.fe-job-details) and the
    // generic extractors can match portfolio objects instead of the job — so
    // try the apply-page extractor first and only use it when solid.
    const applyDetails = extractJobFromApplyPage();
    if (applyDetails) {
      return applyDetails;
    }
    // Try detailed DOM extraction first (most data, no normalization)
    const detailed = extractJobFromSelectors();
    if (detailed) {
      return detailed;
    }
    // Try page source extraction (JSON-LD, embedded data)
    const fromSource = extractJobFromPageSource();
    if (fromSource) {
      return fromSource;
    }
    // Fall back to Nuxt/Vue/script extraction
    return (
      extractJobFromNuxt() ||
      extractJobFromVueApp() ||
      extractJobFromScripts()
    );
  }

  function extractJobFromPageSource() {
    try {
      // ─── Method 1: JSON-LD (application/ld+json) ───
      const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldScripts) {
        try {
          const data = JSON.parse(script.textContent);
          const jobs = Array.isArray(data) ? data : [data];
          for (const item of jobs) {
            if (item["@type"] === "JobPosting" || item["@type"]?.includes("JobPosting")) {
              const skills = Array.isArray(item.skills) ? item.skills.map(s => s.name || s).filter(Boolean) : [];
              const budget = item.baseSalary?.value?.value || item.estimatedBudget || "";
              return {
                title: item.title || "",
                description: (item.description || "").replace(/<[^>]+>/g, "").trim().slice(0, 10000),
                posted_at: item.datePosted || "",
                client_country: item.jobLocation?.address?.addressCountry || item.applicantLocationRequirements?.name || "",
                client_city: item.jobLocation?.address?.addressLocality || "",
                skills,
                budget: String(budget),
                budget_type: item.employmentType?.includes("HOURLY") ? "Hourly" : "Fixed",
                experience_level: item.experienceRequirements?.name || "",
                url: item.url || window.location.href,
                _source: "jsonld",
              };
            }
          }
        } catch {}
      }

      // ─── Method 2: Search ALL script tags for job-like JSON ───
      const allScripts = document.querySelectorAll("script:not([type])");
      for (const script of allScripts) {
        const text = script.textContent || "";
        if (text.includes('"@type"') && text.includes("JobPosting")) {
          try {
            const data = JSON.parse(text);
            const jobs = Array.isArray(data) ? data : [data];
            for (const item of jobs) {
              if (item["@type"] === "JobPosting" && item.title) {
                return normalizeJobData(item);
              }
            }
          } catch {}
        }
        // Search for opening/info/ciphertext pattern
        if (text.includes('"opening"') || text.includes('"ciphertext"')) {
          try {
            // Try to find a JSON object with opening or ciphertext
            const startIdx = text.indexOf("{");
            const endIdx = text.lastIndexOf("}");
            if (startIdx !== -1 && endIdx > startIdx) {
              const candidate = text.slice(startIdx, endIdx + 1);
              const parsed = JSON.parse(candidate);
              const found = findJobInJson(parsed);
              if (found) {
                const normalized = normalizeJobData(found);
                if (normalized && normalized.title) {
                  normalized._source = "script-json";
                  return normalized;
                }
              }
            }
          } catch {}
        }
      }

      // ─── Method 3: Search for __NEXT_DATA__ or similar ───
      for (const globalKey of ["__NEXT_DATA__", "__RENDERED_DATA__", "__INITIAL_STATE__", "__INITIAL_PROPS__"]) {
        const data = window[globalKey];
        if (data) {
          const found = findJobInJson(data);
          if (found) {
            const normalized = normalizeJobData(found);
            if (normalized && normalized.title) {
              normalized._source = globalKey;
              return normalized;
            }
          }
        }
      }

      return null;
    } catch { return null; }
  }

  function extractJobFromNuxt() {
    try {
      const nuxt = window.__NUXT__;
      if (!nuxt?.state) return null;

      const jobViewer = nuxt.state.jobViewer;
      if (jobViewer?.job) {
        return normalizeJobData(jobViewer.job);
      }

      if (nuxt.state.job) {
        return normalizeJobData(nuxt.state.job);
      }

      if (jobViewer) {
        const found = findJobInJson(jobViewer);
        if (found) return normalizeJobData(found);
      }

      const found = findJobInJson(nuxt.state);
      if (found) return normalizeJobData(found);
    } catch { }
    return null;
  }

  function extractJobFromVueApp() {
    try {
      // Vue 3: Walk all elements for __vueParentComponent
      const results = [];
      const allElements = document.querySelectorAll("*");
      for (let i = 0; i < Math.min(allElements.length, 2000); i++) {
        const el = allElements[i];
        // Vue 3: __vueParentComponent
        const v3 = el.__vueParentComponent;
        if (v3?.setupState && typeof v3.setupState === "object") {
          const ss = v3.setupState;
          for (const key of Object.keys(ss)) {
            const val = ss[key];
            if (val && typeof val === "object") {
              const found = findJobInJson(val);
              if (found) results.push(found);
            }
          }
        }
        // Vue 2: __vue__
        const v2 = el.__vue__;
        if (v2 && typeof v2 === "object") {
          for (const key of Object.keys(v2)) {
            const val = v2[key];
            if (val && typeof val === "object") {
              const found = findJobInJson(val);
              if (found) results.push(found);
            }
          }
        }
      }

      for (const job of results) {
        const normalized = normalizeJobData(job);
        if (normalized && normalized.title) {
          normalized._source = "vue-internal";
          return normalized;
        }
      }

      // Try vue app instance on root
      const nuxtEl = document.getElementById("__nuxt") || document.getElementById("app");
      const vueApp = nuxtEl?.__vue_app__;
      if (vueApp) {
        const pinia = vueApp.config?.globalProperties?.$pinia?.state?.value;
        if (pinia) {
          for (const key of Object.keys(pinia)) {
            const state = pinia[key];
            const found = findJobInJson(state);
            if (found) {
              const normalized = normalizeJobData(found);
              if (normalized && normalized.title) {
                normalized._source = "pinia";
                return normalized;
              }
            }
          }
        }
      }

      return null;
    } catch { return null; }
  }

  function extractJobFromScripts() {
    for (const script of document.querySelectorAll("script")) {
      const text = script.textContent || "";
      if (text.includes("__NUXT__")) {
        const nuxtIdx = text.indexOf("window.__NUXT__");
        let match = null;
        if (nuxtIdx !== -1) {
          const slice = text.slice(nuxtIdx);
          let braceCount = 0;
          let start = -1;
          for (let i = 0; i < slice.length; i++) {
            if (slice[i] === '{') { if (start === -1) start = i; braceCount++; }
            else if (slice[i] === '}') { braceCount--; if (braceCount === 0 && start !== -1) { match = [null, slice.slice(start, i + 1)]; break; } }
          }
        }
        if (match) {
          try {
            const nuxt = JSON.parse(match[1]);
            const job = findJobInJson(nuxt);
            if (job) return normalizeJobData(job);
          } catch {}
        }
      }
      if (text.includes("job") && (text.includes("description") || text.includes("budget"))) {
        try {
          const json = JSON.parse(text);
          const job = findJobInJson(json);
          if (job) return normalizeJobData(job);
        } catch {}
      }
    }
    return null;
  }

  function extractJobFromSelectors() {
    try {
      // SUIT2 job details container hierarchy:
      // .job-details-content > .job-details-card > .air3-card-sections > section.air3-card-section (x9)
      const container = document.querySelector(".job-details-content") ||
                        document.querySelector(".air3-card-sections") ||
                        document.querySelector("main") ||
                        document.body;
      const job = {};
      const matched = [];

      // ─── Title ───
      const titleEl = container.querySelector('section.air3-card-section h4 span.flex-1');
      if (titleEl) { job.title = titleEl.textContent?.trim(); matched.push("title"); }

      // ─── Posted time ───
      const postedEl = container.querySelector('.posted-on-line .text-light-on-muted.text-body-sm div');
      if (postedEl) {
        const postedText = postedEl.textContent?.trim() || "";
        const span = postedEl.querySelector("span");
        job.posted_at = span?.textContent?.trim() || postedText;
        matched.push("posted_at");
      }

      // ─── Location ───
      const locEl = container.querySelector(".d-inline-flex.align-items-center.text-base-sm p");
      if (locEl) { job.client_country = locEl.textContent?.trim(); matched.push("location"); }

      // ─── Description ───
      const descEl = container.querySelector('.break[data-test="Description"] .multiline-text');
      if (descEl) { job.description = descEl.textContent?.trim(); matched.push("description"); }

      // ─── Budget ───
      const budgetIcon = container.querySelector('[data-cy="fixed-price"]');
      if (budgetIcon) {
        const budgetLi = budgetIcon.closest('li');
        if (budgetLi) {
          const amountEl = budgetLi.querySelector("strong");
          const typeEl = budgetLi.querySelector(".description");
          if (amountEl) job.budget = amountEl.textContent?.trim();
          if (typeEl) job.budget_type = typeEl.textContent?.trim();
        }
        matched.push("budget");
      }

      // ─── Experience Level ───
      const expIcon = container.querySelector('[data-cy="expertise"]');
      if (expIcon) {
        const expLi = expIcon.closest('li');
        if (expLi) {
          const strongEl = expLi.querySelector("strong");
          if (strongEl) job.experience_level = strongEl.textContent?.trim();
        }
        matched.push("experience_level");
      }

      // ─── Project Type ───
      const projTypeEl = container.querySelector(".segmentations li strong");
      if (projTypeEl && projTypeEl.textContent?.trim() === "Project Type:") {
        const span = projTypeEl.closest("li")?.querySelector("span");
        if (span) job.project_type = span.textContent?.trim();
        matched.push("project_type");
      }

      // ─── Skills ───
      const skillLinks = container.querySelectorAll(".skills-list a.badge");
      if (skillLinks.length > 0) {
        job.skills = Array.from(skillLinks).map(a =>
          a.querySelector(".air3-line-clamp")?.textContent?.trim() || a.textContent?.trim()
        ).filter(Boolean);
        matched.push("skills:" + job.skills.length);
      }

      // ─── Client Activity ───
      const activityItems = container.querySelectorAll(".client-activity-items .ca-item");
      activityItems.forEach((item) => {
        const titleEl = item.querySelector(".title");
        const valueEl = item.querySelector(".value");
        if (!titleEl || !valueEl) return;
        const title = titleEl.textContent?.trim().toLowerCase() || "";
        const value = valueEl.textContent?.trim();
        if (title.includes("proposal")) job.proposals_count = value;
        else if (title.includes("last viewed") || title.includes("viewed")) job.client_last_viewed = value;
        else if (title.includes("interviewing") || title.includes("interview")) job.interviewing_count = value;
        else if (title.includes("invite")) job.invites_sent = value;
        else if (title.includes("unanswered")) job.unanswered_invites = value;
      });
      if (activityItems.length > 0) matched.push("activity:" + activityItems.length);

      // ─── Connects Required ───
      const connectsEl = container.querySelector('[data-v-8889f6f7]');
      if (connectsEl) {
        const text = connectsEl.textContent || "";
        const match = text.match(/Required Connects[^:]*:\s*(\d+)/) || text.match(/(\d+)\s+connects/i);
        if (match) { job.connects_required = parseInt(match[1], 10); matched.push("connects"); }
      }

      // ─── Client Info Section ───
      const clientSection = container.querySelector('.cfe-ui-job-about-client, [data-test="about-client-container"]');
      if (clientSection) {
        matched.push("clientSection");

        // Payment verified
        const payVerified = clientSection.querySelector(".payment-verified");
        if (payVerified) {
          const parentText = payVerified.closest("div, li")?.textContent || "";
          job.client_payment_verified = parentText.toLowerCase().includes("payment method verified");
        }

        // Rating
        const ratingEl = clientSection.querySelector(".air3-rating-value-text");
        if (ratingEl) {
          job.client_rating = parseFloat(ratingEl.textContent?.trim()) || undefined;
        }

        // Reviews count
        const reviewsText = clientSection.querySelector('[data-testid="buyer-rating"]')?.textContent || "";
        const revMatch = reviewsText.match(/of\s+(\d+)\s+reviews/) || reviewsText.match(/(\d+)\s+review/);
        if (revMatch) job.client_reviews_count = parseInt(revMatch[1], 10);

        // Location
        const locLi = clientSection.querySelector('[data-qa="client-location"]');
        if (locLi) {
          const strong = locLi.querySelector("strong");
          const allText = locLi.textContent || "";
          if (strong) job.client_country = strong.textContent?.trim();
          const cityMatch = allText.match(/([A-Za-z\s]+)\d+:\d+/);
          if (cityMatch) job.client_city = cityMatch[1].trim();
        }

        // Job posting stats
        const statsLi = clientSection.querySelector('[data-qa="client-job-posting-stats"]');
        if (statsLi) {
          const txt = statsLi.textContent || "";
          const jobsMatch = txt.match(/(\d+)\s+jobs?\s+posted/i);
          const hireMatch = txt.match(/(\d+)%\s*hire/i);
          const openMatch = txt.match(/(\d+)\s+open/i);
          if (jobsMatch) job.client_jobs_posted = parseInt(jobsMatch[1], 10);
          if (hireMatch) job.client_hire_rate_pct = parseInt(hireMatch[1], 10);
          if (openMatch) job.client_open_jobs = parseInt(openMatch[1], 10);
        }

        // Spend
        const spendLi = clientSection.querySelector('[data-qa="client-spend"]');
        if (spendLi) {
          const txt = spendLi.textContent || "";
          const amountMatch = txt.match(/\$([\d,]+(?:\.\d+)?)/);
          if (amountMatch) job.client_total_spend = amountMatch[1].replace(",", "");
        }

        // Hires
        const hiresEl = clientSection.querySelector('[data-qa="client-hires"]');
        if (hiresEl) {
          const txt = hiresEl.textContent || "";
          const hiresMatch = txt.match(/(\d+)\s+hires/i);
          const activeMatch = txt.match(/(\d+)\s+active/i);
          if (hiresMatch) job.client_total_hires = parseInt(hiresMatch[1], 10);
          if (activeMatch) job.client_active_hires = parseInt(activeMatch[1], 10);
        }

        // Member since
        const memberLi = clientSection.querySelector('[data-qa="client-contract-date"]');
        if (memberLi) {
          const txt = memberLi.textContent || "";
          const dateMatch = txt.match(/Member since\s+(.+)/i);
          if (dateMatch) job.client_member_since = dateMatch[1].trim();
        }

        // Company profile
        const industryEl = clientSection.querySelector('[data-qa="client-company-profile-industry"]');
        if (industryEl) job.client_industry = industryEl.textContent?.trim();
        const sizeEl = clientSection.querySelector('[data-qa="client-company-profile-size"]');
        if (sizeEl) job.client_company_size = sizeEl.textContent?.trim();
      }

      // ─── Job Link ───
      const jobLinkInput = container.querySelector('input[aria-label="Job link"]');
      if (jobLinkInput) job.url = jobLinkInput.value?.trim() || window.location.href;
      if (!job.url) job.url = window.location.href;

      // ─── Client's Recent History ───
      const historyItems = container.querySelectorAll('[data-cy="job"]');
      if (historyItems.length > 0) {
        job.client_recent_history = Array.from(historyItems).map((item) => {
          const titleLink = item.querySelector('[data-cy="job-title"]');
          const ratingEl = item.querySelector(".air3-rating-value-text");
          const dateEl = item.querySelector('[data-cy="date"]');
          // All truncation elements: client short feedback + freelancer full review
          // (DOM already has full text after "more" buttons auto-clicked in retry loop)
          const truncEls = item.querySelectorAll(".air3-truncation");
          const allFeedback = Array.from(truncEls || [])
            .map(el => el.firstElementChild?.textContent?.trim() || "")
            .filter(Boolean);
          // Freelancer name
          const freelncEl = item.querySelector('.text-body-sm a[href*="/freelancers/"]');
          return {
            title: titleLink?.textContent?.trim() || "",
            url: titleLink?.getAttribute("href") || "",
            rating: ratingEl ? parseFloat(ratingEl.textContent?.trim()) : undefined,
            date: dateEl?.textContent?.trim() || "",
            feedback: allFeedback.join(" | ").slice(0, 500),
            freelancerName: freelncEl?.textContent?.trim() || undefined,
          };
        }).filter(h => h.title);
        matched.push("history:" + job.client_recent_history.length);
      }

      if (job.title) {
        return job;
      }
      return null;
    } catch { return null; }
  }

  function findJobInJson(json, _depth = 0) {
    if (!json || typeof json !== "object" || _depth > 20) return null;
    // SUIT2 common patterns
    if (json.jobViewer?.job) return json.jobViewer.job;
    if (json.job && typeof json.job.title === "string") return json.job;
    if (json.opening?.info?.title) return json; // VisitorJobDetails top-level opening
    if (json.jobDetails?.title) return json.jobDetails;
    if (json.data?.jobViewer?.job) return json.data.jobViewer.job;
    if (json.data?.jobPubDetails?.opening) return json.data.jobPubDetails; // SUIT2 VisitorJobDetails
    if (json.data?.opening?.info?.title) return json.data;
    if (json.data?.jobDetails?.title) return json.data.jobDetails;

    // Try any key in data that looks like a job
    if (json.data && typeof json.data === "object") {
      for (const key of Object.keys(json.data)) {
        const val = json.data[key];
        if (val && typeof val === "object") {
          if (val.info?.ciphertext || val.opening?.info?.ciphertext) {
            return val.opening || val;
          }
          if (val.title && (val.description || val.budget)) {
            return val;
          }
        }
      }
    }

    if (json.props?.pageProps?.job) return json.props.pageProps.job;

    if (isJobShape(json)) return json;

    for (const key of Object.keys(json)) {
      if (typeof json[key] === "object" && json[key] !== null) {
        const found = findJobInJson(json[key], _depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  function isJobShape(obj) {
    if (!obj || typeof obj !== "object") return false;
    const hasTitle = typeof obj.title === "string" && obj.title.length > 0;
    const hasDesc = typeof obj.description === "string" && obj.description.length > 20;
    const hasBudget = obj.budget !== undefined || obj.hourlyMin !== undefined;
    return hasTitle && (hasDesc || hasBudget);
  }

  function normalizeJobData(job) {
    if (!job || typeof job !== "object") return null;

    // Handle VisitorJobDetails shape: { opening: {...}, buyer: {...}, buyerExtra: {...} }
    const opening = job.opening || job;
    const buyer = job.buyer || {};
    const buyerExtra = job.buyerExtra || {};
    const location = buyer.location || {};
    const stats = buyer.stats || {};
    const company = buyer.company || {};
    const companyProfile = company.profile || {};
    const sandsData = opening.sandsData || {};

    // Skills from various locations
    let skills = [];
    if (Array.isArray(job.skills)) {
      skills = job.skills;
    } else if (Array.isArray(opening.skills)) {
      skills = opening.skills;
    } else {
      const ontologySkills = (sandsData.ontologySkills || []).map(s => s.prefLabel).filter(Boolean);
      const additionalSkills = (sandsData.additionalSkills || []).map(s => s.prefLabel).filter(Boolean);
      skills = [...new Set([...ontologySkills, ...additionalSkills])];
    }
    skills = skills.map((s) => {
      if (typeof s === "string") return s;
      if (s?.prettyName) return s.prettyName;
      if (s?.name) return s.name;
      if (s?.node?.prettyName) return s.node.prettyName;
      return "";
    }).filter(Boolean);

    // Budget
    let budgetStr = undefined;
    if (opening.budget?.amount) {
      budgetStr = String(opening.budget.amount);
    } else if (job.budget) {
      budgetStr = String(job.budget);
    } else if (job.hourlyMin || job.hourlyMax) {
      budgetStr = `$${job.hourlyMin}-$${job.hourlyMax}/hr`;
    } else {
      const eb = opening.extendedBudgetInfo || {};
      if (eb.hourlyBudgetMin || eb.hourlyBudgetMax) {
        budgetStr = `$${eb.hourlyBudgetMin}-$${eb.hourlyBudgetMax}/hr`;
      }
    }

    // Client activity
    const activity = opening.clientActivity || {};

    // Compute hire rate
    let hireRate = job.clientHireRate || job.client_hire_rate || undefined;
    if (hireRate === undefined && stats.totalJobsWithHires !== undefined && stats.totalAssignments > 0) {
      hireRate = Math.round((stats.totalJobsWithHires / stats.totalAssignments) * 100);
    }

    const info = opening.info || {};

    return {
      title: info.title || opening.title || job.title || "",
      description: (opening.description || job.description || "").slice(0, 10000),
      url: window.location.href,
      budget: budgetStr,
      skills,
      clientCountry: location.country || job.clientCountry || job.client_country || "",
      clientRating: stats.score || job.clientRating || job.client_rating || undefined,
      clientTotalSpend: job.clientTotalSpend || job.client_spend || (stats.totalCharges || {}).amount || undefined,
      clientHireRate: hireRate,
      proposalsCount: activity.totalApplicants || job.proposalsCount || job.proposals_count || undefined,
      postedAt: opening.postedOn || job.postedAt || job.posted_at || undefined,
      paymentVerified: buyerExtra.isPaymentMethodVerified || undefined,
      companyIndustry: companyProfile.industry || undefined,
      companySize: companyProfile.size || undefined,
      captured_at: new Date().toISOString(),
    };
  }

  // ─── TALENT SEARCH (FREELANCER COMPETITION COUNT) ───

  function getSkillFromTalentUrl() {
    try {
      return new URL(window.location.href).searchParams.get("q")?.trim() || "";
    } catch {
      return "";
    }
  }

  function parseFreelancerCount(text) {
    if (!text) return null;
    const t = String(text);
    let m = t.match(/of\s+([\d,]+)\s+Freelancers?/i) || t.match(/^([\d,]+)\s+Freelancers?$/i);
    if (!m) m = t.match(/([\d,]+)\s+Freelancers?/i);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function extractTalentCountFromDom() {
    try {
      const candidates = document.querySelectorAll("[data-test], [data-qa], h1, h2, h3, p, span, strong, div");
      let best = null;
      for (const el of candidates) {
        const text = (el.textContent || "").trim();
        if (!text || text.length > 80) continue;
        const m = text.match(/^([\d,]+)\s+Freelancers?$/i) || text.match(/of\s+([\d,]+)\s+Freelancers?/i);
        if (!m) continue;
        const n = parseInt(m[1].replace(/,/g, ""), 10);
        if (!Number.isFinite(n) || n <= 0) continue;
        const childCount = el.querySelectorAll("*").length;
        if (!best || childCount < best.childCount) best = { n, childCount };
      }
      return best ? best.n : null;
    } catch {
      return null;
    }
  }

  function findFreelancerCountInJson(json, depth) {
    if (!json || typeof json !== "object" || depth > 25) return null;
    for (const key of Object.keys(json)) {
      const val = json[key];
      if (/freelancer/i.test(key) && /(count|total|num|number)/i.test(key)) {
        if (typeof val === "number" && val > 0 && val < 1e8) return Math.round(val);
        if (typeof val === "string") {
          const n = parseFreelancerCount(val);
          if (n != null) return n;
        }
      }
      if (/(totalcount|totalresults|numresults|resultcount)/i.test(key)) {
        if (typeof val === "number" && val > 0 && val < 1e8) return Math.round(val);
      }
    }
    for (const key of Object.keys(json)) {
      const val = json[key];
      if (val && typeof val === "object") {
        const found = findFreelancerCountInJson(val, depth + 1);
        if (found != null) return found;
      }
    }
    return null;
  }

  function extractTalentCountFromNuxt() {
    try {
      if (window.__NUXT__?.state) {
        return findFreelancerCountInJson(window.__NUXT__.state, 0);
      }
    } catch {}
    return null;
  }

  function extractTalentCountFromScripts() {
    for (const script of document.querySelectorAll("script")) {
      const text = script.textContent || "";
      if (!text.includes("Freelancer") && !/totalCount|numResults/.test(text)) continue;
      const nuxtIdx = text.indexOf("window.__NUXT__");
      if (nuxtIdx === -1) continue;
      const slice = text.slice(nuxtIdx);
      let braceCount = 0;
      let start = -1;
      for (let i = 0; i < slice.length; i++) {
        if (slice[i] === "{") {
          if (start === -1) start = i;
          braceCount++;
        } else if (slice[i] === "}") {
          braceCount--;
          if (braceCount === 0 && start !== -1) {
            try {
              const parsed = JSON.parse(slice.slice(start, i + 1));
              const found = findFreelancerCountInJson(parsed, 0);
              if (found != null) return found;
            } catch {}
            break;
          }
        }
      }
    }
    return null;
  }

  function tryExtractTalentCountWithRetry(attempt) {
    const skill = getSkillFromTalentUrl();
    const count =
      extractTalentCountFromDom() ??
      extractTalentCountFromNuxt() ??
      extractTalentCountFromScripts();

    if (count != null) {
      window.postMessage({
        type: "__upscore_result",
        operation: "talentSearchCount",
        success: true,
        data: { skill: skill.slice(0, 200), freelancerCount: count },
      }, "*");
      return;
    }

    if (attempt < 15) {
      setTimeout(() => tryExtractTalentCountWithRetry(attempt + 1), 1000);
      return;
    }

    window.postMessage({
      type: "__upscore_result",
      operation: "talentSearchCount",
      success: false,
      data: { skill: skill.slice(0, 200), freelancerCount: null },
      error: "Could not extract freelancer count",
    }, "*");
  }

  // ─── FETCH JOB DETAILS VIA UPWORK GRAPHQL API ───

  function getVisitorGqlToken() {
    try {
      const match = document.cookie.match(/(?:^|;\s*)visitor_gql_token=([^;]*)/);
      return match ? match[1] : null;
    } catch { return null; }
  }

  async function fetchJobDetailsFromUpworkApi(ciphertext, providedToken) {
    if (!ciphertext) {
      window.postMessage({
        type: "__upscore_result",
        operation: "jobDetails",
        success: false,
        error: "No ciphertext provided",
      }, "*");
      return;
    }

    try {
      let token = providedToken || getVisitorGqlToken();

      if (!token) {
        try {
          const resp = await fetch("https://www.upwork.com/", { credentials: "include" });
          token = getVisitorGqlToken();
        } catch {}
      }

      const alias = "gql-query-get-visitor-job-details";
      const url = `https://www.upwork.com/api/graphql/v1?alias=${alias}`;

      const payload = {
        query: `
          query VisitorJobDetails($jobCiphertext: String!) {
            jobPubDetails {
              opening {
                status
                postedOn
                workload
                contractorTier
                description
                info { ciphertext id type access title hideBudget createdOn premium }
                segmentationData { label name type value }
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
                  unansweredInvites
                  invitationsSent
                  numberOfPositionsToHire
                  lastBuyerActivity
                }
              }
              qualifications { countries timezones prefEnglishSkill minHoursWeek locationCheckRequired }
              buyer {
                location { city country }
                stats {
                  totalAssignments activeAssignmentsCount hoursCount
                  feedbackCount score totalJobsWithHires
                  totalCharges { amount }
                }
                company { contractDate profile { industry size } }
              }
              buyerExtra { isPaymentMethodVerified }
            }
          }
        `,
        variables: { jobCiphertext: ciphertext },
      };

      const headers = {
        "Accept": "*/*",
        "Content-Type": "application/json",
        "X-Upwork-Accept-Language": "en-US",
        "Referer": `https://www.upwork.com/jobs/~${ciphertext}`,
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const gqlResp = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
      });

      if (!gqlResp.ok) {
        throw new Error(`GraphQL returned ${gqlResp.status}`);
      }

      const data = await gqlResp.json();
      if (data.errors) {
        throw new Error(data.errors[0]?.message || JSON.stringify(data.errors));
      }

      const details = data?.data?.jobPubDetails || {};
      const opening = details.opening || {};
      const info = opening.info || {};
      const sandsData = opening.sandsData || {};
      const budgetInfo = opening.extendedBudgetInfo || {};
      const activity = opening.clientActivity || {};
      const buyer = details.buyer || {};
      const location = buyer.location || {};
      const stats = buyer.stats || {};
      const company = buyer.company || {};
      const companyProfile = company.profile || {};

      const ontologySkills = (sandsData.ontologySkills || []).map(s => s.prefLabel).filter(Boolean);
      const additionalSkills = (sandsData.additionalSkills || []).map(s => s.prefLabel).filter(Boolean);
      const allSkills = [...new Set([...ontologySkills, ...additionalSkills])];

      let budgetStr = undefined;
      const b = opening.budget || {};
      if (b.amount) {
        budgetStr = `${b.amount}`;
      } else if (budgetInfo.hourlyBudgetMin || budgetInfo.hourlyBudgetMax) {
        const min = budgetInfo.hourlyBudgetMin || "";
        const max = budgetInfo.hourlyBudgetMax || "";
        budgetStr = `$${min}-$${max}/hr`;
      }

      const job = {
        title: info.title || "",
        description: (opening.description || "").slice(0, 10000),
        url: `https://www.upwork.com/jobs/~${ciphertext}`,
        budget: budgetStr,
        skills: allSkills,
        clientCountry: location.country || "",
        clientRating: stats.score || undefined,
        clientTotalSpend: (stats.totalCharges || {}).amount || undefined,
        clientHireRate: stats.totalJobsWithHires !== undefined ? Math.round((stats.totalJobsWithHires / stats.totalAssignments) * 100) : undefined,
        proposalsCount: activity.totalApplicants || undefined,
        postedAt: opening.postedOn || undefined,
        captured_at: new Date().toISOString(),
        companyIndustry: companyProfile.industry || undefined,
        companySize: companyProfile.size || undefined,
        paymentVerified: details.buyerExtra?.isPaymentMethodVerified || undefined,
        ciphertext,
      };

      window.postMessage({
        type: "__upscore_result",
        operation: "jobDetails",
        success: true,
        data: job,
      }, "*");
    } catch (err) {
      window.postMessage({
        type: "__upscore_result",
        operation: "jobDetails",
        success: false,
        error: err.message,
      }, "*");
    }
  }

  function insertPortfolioOnApplyPage(portfolioItems) {
    if (!Array.isArray(portfolioItems) || portfolioItems.length === 0) return;

    const textarea = document.querySelector("textarea[name='cover_letter']") ||
                     document.querySelector('[data-qa="cover-letter-textarea"]') ||
                     document.querySelector("textarea");
    if (!textarea) return;

    const portfolioText = portfolioItems.slice(0, 3).map((item) => {
      return `- ${item.title}: ${(item.description || "").slice(0, 200)}`;
    }).join("\n");

    const insertText = `\n\nRelevant portfolio work:\n${portfolioText}\n`;
    const pos = textarea.selectionStart || textarea.value.length;
    textarea.value = textarea.value.slice(0, pos) + insertText + textarea.value.slice(pos);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  window.__upscore_getCookies = function () {
    return new Promise(function (resolve) {
      function handler(e) {
        if (e.data && e.data.type === "__upscore_result" && e.data.operation === "getCookies") {
          window.removeEventListener("message", handler);
          resolve(e.data.cookies || "");
        }
      }
      window.addEventListener("message", handler);
      window.postMessage({ type: "__upscore_exec", operation: "getCookies" }, "*");
      setTimeout(function () { window.removeEventListener("message", handler); resolve(""); }, 5000);
    });
  };
})();
