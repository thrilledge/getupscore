/**
 * POST /api/proposals/generate
 *
 * Generate an AI proposal for a specific job using GroqCloud.
 * Requires the user to be authenticated (either via Supabase session or extension token).
 *
 * Body:
 *   { jobId: string; customInstructions?: string }
 *
 * The API will:
 *  1. Fetch the job details from the DB
 *  2. Fetch the user's profile info for personalization
 *  3. Fetch any existing analysis (for tips)
 *  4. Generate the proposal via GroqCloud
 *  5. Store it in the proposals table
 *  6. Return the generated proposal
 */
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { generateProposal } from "@/lib/proposals/generate";

export async function POST(request: Request) {
  try {
    // Auth
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
    const { jobId, customInstructions } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const supabase = await createSupabaseAdminClient();

    // Fetch job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch user metadata for personalization
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const metadata = userData?.user?.user_metadata || {};
    const userEmail = userData?.user?.email || "";

    // Fetch existing analysis for tips
    const { data: analysis } = await supabase
      .from("job_analyses")
      .select("*")
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .single();

    const analysisData = analysis as Record<string, any> | null;

    // Fetch user's skills from their filters
    const { data: filters } = await supabase
      .from("job_filters")
      .select("keywords")
      .eq("user_id", userId)
      .limit(5);

    const userKeywords = filters?.flatMap((f: any) => f.keywords || []) || [];

    // Build proposal input
    const proposalInput = {
      jobTitle: job.title || "Untitled",
      jobDescription: job.description || "",
      jobUrl: job.url || undefined,
      skills: [] as string[],
      budget: job.budget ? `$${job.budget}` : job.hourly_min ? `$${job.hourly_min}-$${job.hourly_max}/hr` : undefined,
      clientCountry: job.client_country || undefined,
      proposalTips: (analysisData?.proposal_tips as string[]) || [],
      matchScore: analysisData?.match_score || undefined,
      opportunityScore: analysisData?.opportunity_score || undefined,
      winProbability: analysisData?.win_probability || undefined,
      recommendation: analysisData?.recommendation || undefined,
      userName: metadata?.display_name || userEmail?.split("@")[0] || "Freelancer",
      userSkills: userKeywords,
      userExperience: customInstructions || undefined,
    };

    // Generate proposal
    const result = await generateProposal(proposalInput);

    // Validate result
    if (!result.generated_text || result.generated_text.length < 50) {
      return NextResponse.json({ error: "Proposal generation returned empty result" }, { status: 500 });
    }

    // Store in DB
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
      // Still return the generated text even if DB save fails
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
  } catch (err: any) {
    console.error("[Proposals] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
