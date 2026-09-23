import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { cacheInvalidate } from "@/lib/cache";

const MAX_JOBS_PER_REQUEST = 20;

/**
 * POST /api/extension/jobs/sync
 * Receive captured jobs (optionally with AI analysis) from the extension.
 * Upserts jobs synchronously, then sends Inngest events for analysis + notify.
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user_id as string;

  try {
    const body = await request.json();
    let { jobs } = body;

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    if (jobs.length > MAX_JOBS_PER_REQUEST) {
      jobs = jobs.slice(0, MAX_JOBS_PER_REQUEST);
    }

    const supabase = createSupabaseAdminClient();
    const jobsForInngest: any[] = [];

    for (const job of jobs) {
      const url = String(job.url || "");
      if (looksLikeProfilePage(url)) continue;

      const title = String(job.title || "Untitled").slice(0, 500);
      if (!title || title.length < 3) continue;

      const upworkJobId =
        String(job.job_id || "").trim() ||
        String(job.url || "")
          .match(/~([a-f0-9]{16,})/)?.[1] ||
        `ext_${simpleHash(title + (job.url || ""))}`;

      const budgetVal = parseBudget(job.budget);
      let hourlyMin = null;
      let hourlyMax = null;
      if (job.budget && typeof job.budget === "string") {
        const hourlyMatch = job.budget.match(/\$(\d+)\s*[-–]\s*\$?(\d+)\s*\/hr/i);
        if (hourlyMatch) {
          hourlyMin = parseFloat(hourlyMatch[1]);
          hourlyMax = parseFloat(hourlyMatch[2]);
        }
      }

      const jobRecord: Record<string, unknown> = {
        upwork_job_id: upworkJobId,
        title,
        description: job.description ? String(job.description).slice(0, 10000) : null,
        url: String(job.url || "").slice(0, 1000),
        posted_at: job.posted_at
          ? (() => { try { return new Date(job.posted_at).toISOString(); } catch { return null; } })()
          : null,
        budget: budgetVal,
        hourly_min: hourlyMin,
        hourly_max: hourlyMax,
        client_country: String(job.client_country || "").slice(0, 100) || null,
        proposals_count: parseInt(job.proposals_count, 10) || null,
        skills: Array.isArray(job.skills) ? job.skills.slice(0, 50) : null,
        client_rating: parseFloat(job.client_rating) || null,
        client_name: String(job.client_name || "").slice(0, 200) || null,
        client_total_spend: parseFloat(job.client_total_spend) || null,
        client_spend: parseFloat(job.client_total_spend) || null,
        client_total_hires: parseInt(job.client_total_hires, 10) || null,
        client_hire_rate: parseInt(job.client_hire_rate_pct || job.client_hire_rate, 10) || null,
        client_total_assignments: parseInt(job.client_jobs_posted, 10) || null,
        client_member_since: job.client_member_since
          ? (() => { try { return new Date(job.client_member_since).toISOString(); } catch { return null; } })()
          : null,
        client_industry: String(job.company_industry || job.client_industry || "").slice(0, 200) || null,
        payment_verified: job.client_payment_verified === true || job.payment_verified === true,
        job_type: String(job.budget_type || job.job_type || "").slice(0, 50) || null,
        contractor_tier: String(job.experience_level || "").slice(0, 50) || null,
        total_invited: parseInt(job.invites_sent, 10) || null,
        total_hired: parseInt(job.interviewing_count, 10) || null,
        hours_per_week: String(job.hours_per_week || "").slice(0, 50) || null,
        category: String(job.category || "").slice(0, 200) || null,
        source: "extension_dom",
      };

      if (job.client_recent_history && Array.isArray(job.client_recent_history) && job.client_recent_history.length > 0) {
        jobRecord.client_recent_history = job.client_recent_history.slice(0, 20);
      }

      jobsForInngest.push({
        jobRecord,
        upworkJobId,
        title,
        url: job.url || "",
        budget: job.budget ? String(job.budget) : undefined,
        country: job.country || job.client_country || "",
        skills: Array.isArray(job.skills) ? job.skills : [],
        proposalsCount: parseInt(job.proposals_count, 10) || undefined,
        analysis: job.analysis && typeof job.analysis === "object" ? job.analysis : null,
      });
    }

    // Send batch to Inngest for analysis + notifications
    if (jobsForInngest.length > 0) {
      await inngest.send({ name: "app/extension.sync", data: { userId, jobs: jobsForInngest } });
    }

    // Invalidate cache
    await cacheInvalidate("jobs:");
    await cacheInvalidate("system:");

    return NextResponse.json({ count: jobsForInngest.length });
  } catch (err) {
    console.error("[Extension Jobs] Error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

function looksLikeProfilePage(url: string): boolean {
  if (!url) return false;
  if (/\/freelancers\//i.test(url)) return true;
  if (/\/users\//i.test(url)) return true;
  return false;
}

function parseBudget(value: unknown): number | null {
  if (!value) return null;
  const str = String(value);
  const match = str.replace(/,/g, "").match(/\$?([\d.]+)/);
  return match ? parseFloat(match[1]) || null : null;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).padStart(8, "0");
}
