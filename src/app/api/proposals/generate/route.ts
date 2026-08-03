import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { generateProposal, streamProposal } from "@/lib/proposals/generate";
import { analyzeJob } from "@/lib/jobs/analyze";

async function respondFromDbJob(
  supabase: any,
  job: Record<string, any>,
  userId: string,
  baseInput: Record<string, unknown>
) {
  const jobId = job.id;

  const { data: existingAnalysis } = await supabase
    .from("job_analyses")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .single();

  let analysisData = existingAnalysis as Record<string, unknown> | null;

  if (!analysisData) {
    try {
      analysisData = await analyzeJob(supabase, job, jobId, userId);
    } catch (analyzeErr: any) {
      console.warn("[Proposals] On-demand analysis error:", analyzeErr.message);
    }
  }

  const proposalInput = {
    ...baseInput,
    jobTitle: job.title || "Untitled",
    jobDescription: job.description || "",
    jobUrl: job.url || undefined,
    skills: (job.skills as string[]) || [],
    budget: job.budget ? `$${job.budget}` : job.hourly_min ? `$${job.hourly_min}-$${job.hourly_max}/hr` : undefined,
    clientCountry: job.client_country || undefined,
    proposalsCount: job.proposals_count || undefined,
    postedAt: job.posted_at || undefined,
    clientHireRate: job.client_hire_rate || undefined,
    clientTotalSpend: job.client_spend || undefined,
    clientRating: job.client_rating || undefined,
    proposalTips: (analysisData?.proposal_tips as string[]) || [],
    matchScore: analysisData?.match_score as number | undefined,
    opportunityScore: analysisData?.opportunity_score as number | undefined,
    winProbability: analysisData?.win_probability as number | undefined,
    recommendation: analysisData?.recommendation as string | undefined,
  };

  const result = await generateProposal(proposalInput);

  if (!result.generated_text || result.generated_text.length < 50) {
    return NextResponse.json({ error: "Proposal generation returned empty result" }, { status: 500 });
  }

  const { data: proposal, error: insertError } = await supabase
    .from("proposals")
    .insert({
      user_id: userId,
      job_id: jobId,
      generated_text: result.generated_text,
      score: result.score || null,
      status: "draft",
    })
    .select("id, generated_text, score, status, created_at")
    .single();

  if (insertError) {
    console.error("[Proposals] Insert error:", insertError.message);
    return NextResponse.json({
      ok: true,
      proposal: result.generated_text,
      score: result.score,
      saved: false,
    });
  }

  return NextResponse.json({
    ok: true,
    proposal: proposal.generated_text,
    score: proposal.score,
    id: proposal.id,
    saved: true,
    created_at: proposal.created_at,
  });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    let userId: string | null = null;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const supabase = await createSupabaseAdminClient();
      const { data } = await supabase
        .from("api_tokens")
        .select("user_id")
        .eq("token", token)
        .single();
      if (data) userId = data.user_id;
    } else {
      const supabase = await createSupabaseAdminClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, jobDetails, upworkJobId, customInstructions, stream } = body;

    if (!jobId && !jobDetails && !upworkJobId) {
      return NextResponse.json({ error: "Provide either jobId, jobDetails or upworkJobId" }, { status: 400 });
    }

    const supabase = await createSupabaseAdminClient();
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const metadata = userData?.user?.user_metadata || {};

    const { data: filters } = await supabase
      .from("job_filters")
      .select("keywords")
      .eq("user_id", userId)
      .limit(5);

    const userKeywords = (filters?.flatMap((f: Record<string, unknown>) => (f.keywords as string[]) || []) || []) as string[];

    const { data: profile } = await supabase
      .from("upwork_profiles")
      .select("title, bio, skills, portfolio, hourly_rate")
      .eq("user_id", userId)
      .single();

    const portfolio = (profile?.portfolio as { title: string; description?: string }[]) || [];
    const portfolioPreview = portfolio.length
      ? portfolio.slice(0, 5).map((p) => `- ${p.title}${p.description ? ": " + p.description.slice(0, 200) : ""}`).join("\n")
      : undefined;

    const baseInput = {
      userName: metadata?.display_name || metadata?.full_name || undefined,
      userTitle: profile?.title || undefined,
      userSkills: profile?.skills?.length ? (profile.skills as string[]) : userKeywords,
      userExperience: profile?.bio || undefined,
      portfolioItems: portfolioPreview,
      customInstructions: customInstructions || undefined,
    };

    if (jobDetails) {
      const d = jobDetails as Record<string, unknown>;

      // ── STEP 1: Auto-save the job to the database ──
      const upworkJobId =
        String(d.job_id || d.upwork_job_id || "").trim() ||
        String(d.url || "")
          .match(/~([a-f0-9]{16,})/)?.[1] ||
        `inline_${Date.now()}`;

      const jobRecord = {
        upwork_job_id: upworkJobId,
        title: String(d.title || d.jobTitle || "Untitled").slice(0, 500),
        description: d.description || d.jobDescription ? String(d.description || d.jobDescription).slice(0, 10000) : null,
        url: String(d.url || "").slice(0, 1000),
        posted_at: d.posted_at || d.postedAt
          ? (() => { try { return new Date(String(d.posted_at || d.postedAt)).toISOString(); } catch { return null; } })()
          : null,
        budget: parseFloat(String(d.budget ?? "")) || null,
        hourly_min: typeof d.hourly_min === "number" ? d.hourly_min : null,
        hourly_max: typeof d.hourly_max === "number" ? d.hourly_max : null,
        client_country: String(d.client_country || d.clientCountry || "").slice(0, 100) || null,
        proposals_count: typeof d.proposals_count === "number" ? d.proposals_count
          : typeof d.proposalsCount === "number" ? d.proposalsCount : null,
        skills: Array.isArray(d.skills) ? d.skills.slice(0, 50) : null,
        client_rating: parseFloat(String(d.client_rating || d.clientRating || "")) || null,
        client_total_spend: parseFloat(String(d.client_total_spend || d.clientTotalSpend || "")) || null,
        client_spend: parseFloat(String(d.client_total_spend || d.clientTotalSpend || "")) || null,
        client_total_hires: parseInt(String(d.client_total_hires ?? ""), 10) || null,
        client_hire_rate: parseInt(String(d.client_hire_rate_pct || d.client_hire_rate || ""), 10) || null,
        client_name: String(d.client_name || "").slice(0, 200) || null,
        client_member_since: d.client_member_since
          ? (() => { try { return new Date(String(d.client_member_since)).toISOString(); } catch { return null; } })()
          : null,
        payment_verified: d.client_payment_verified === true || d.payment_verified === true,
        job_type: String(d.budget_type || d.job_type || "").slice(0, 50) || null,
        contractor_tier: String(d.experience_level || "").slice(0, 50) || null,
        hours_per_week: String(d.hours_per_week || "").slice(0, 50) || null,
        source: "extension_proposal",
      };

      const { data: savedJob, error: saveError } = await supabase
        .from("jobs")
        .upsert(jobRecord as any, { onConflict: "upwork_job_id", ignoreDuplicates: false })
        .select("id")
        .single();

      let dbJobId = savedJob?.id;

      if (!dbJobId || saveError) {
        console.warn("[Proposals] Auto-save failed:", saveError?.message);
      }

      // ── STEP 2: Analyze the job (even if save failed — we have rich data) ──
      let analysisData: Record<string, any> | null = null;
      if (dbJobId) {
        try {
          analysisData = await analyzeJob(supabase, jobRecord, dbJobId, userId);
        } catch (analyzeErr: any) {
          console.warn("[Proposals] Analysis error:", analyzeErr.message);
        }
      }

      // ── STEP 3: Build rich proposal input with analysis context ──
      const budgetStr = d.budget_type === "hourly"
        ? d.budget ? String(d.budget) : d.hourly_min ? `$${d.hourly_min}/hr - $${d.hourly_max}/hr` : undefined
        : d.budget ? String(d.budget) : undefined;

      const proposalsCount = typeof d.proposals_count === "number" ? d.proposals_count
        : typeof d.proposalsCount === "number" ? d.proposalsCount : undefined;

      const proposalInput = {
        ...baseInput,
        jobTitle: String(d.title || d.jobTitle || "Untitled"),
        jobDescription: String(d.description || d.jobDescription || ""),
        jobUrl: d.url ? String(d.url) : undefined,
        budget: budgetStr,
        skills: Array.isArray(d.skills) ? d.skills as string[] : [],
        clientCountry: String(d.client_country || d.clientCountry || "").slice(0, 100) || undefined,
        proposalsCount,
        postedAt: d.posted_at || d.postedAt ? String(d.posted_at || d.postedAt) : undefined,
        clientHireRate: typeof d.client_hire_rate === "number" ? d.client_hire_rate
          : typeof d.clientHireRate === "number" ? d.clientHireRate : undefined,
        clientTotalSpend: typeof d.client_total_spend === "number" ? d.client_total_spend
          : typeof d.clientTotalSpend === "number" ? d.clientTotalSpend : undefined,
        clientRating: typeof d.client_rating === "number" ? d.client_rating
          : typeof d.clientRating === "number" ? d.clientRating : undefined,
        // Include analysis results if available
        proposalTips: (analysisData?.proposal_tips as string[]) || undefined,
        matchScore: analysisData?.match_score || undefined,
        opportunityScore: analysisData?.opportunity_score || undefined,
        winProbability: analysisData?.win_probability || undefined,
        recommendation: analysisData?.recommendation || undefined,
      };

      const result = stream
        ? null
        : await generateProposal(proposalInput);

      if (stream) {
        // ── STREAMING MODE: Return SSE with reasoning + proposal ──
        const proposalStream = await streamProposal(proposalInput);
        const encoder = new TextEncoder();
        const combined = new ReadableStream({
          async start(controller) {
            // Send status event before streaming
            controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify({
              phase: "generating",
              saved: !!dbJobId,
              jobId: dbJobId,
            })}\n\n`));

            // Pipe the proposal stream
            const reader = proposalStream.getReader();
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
          },
        });

        return new Response(combined, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      if (!result || !result.generated_text || result.generated_text.length < 50) {
        return NextResponse.json({ error: "Proposal generation returned empty result" }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        proposal: result.generated_text,
        score: result.score,
        saved: !!dbJobId,
        jobId: dbJobId,
      });
    }

    if (jobId) {
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      return respondFromDbJob(supabase, job, userId, baseInput);
    }

    if (upworkJobId) {
      const raw = String(upworkJobId).trim();
      const candidates = Array.from(new Set([
        raw,
        raw.replace(/^~/, ""),
        raw.startsWith("~") ? raw : `~${raw}`,
      ])).filter(Boolean);

      const { data: rows, error: lookupError } = await supabase
        .from("jobs")
        .select("*")
        .or(candidates.map((c) => `upwork_job_id.eq.${c}`).join(","))
        .limit(1);

      const job = rows && rows[0];

      if (lookupError || !job) {
        return NextResponse.json({ error: "Job not found in database" }, { status: 404 });
      }

      return respondFromDbJob(supabase, job, userId, baseInput);
    }

    return NextResponse.json({ error: "Provide either jobId, jobDetails or upworkJobId" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Proposals] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
