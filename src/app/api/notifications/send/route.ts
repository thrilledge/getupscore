/**
 * POST /api/notifications/send
 *
 * Send a test notification through a specific channel.
 *
 * Auth: Bearer <CRON_SECRET> or Bearer <supabase_jwt> or session cookie
 *
 * Body: { channelId: string; jobId?: string }
 */
import { NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyUser, type JobAlertContext } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { channelId, jobId } = body;

    const authHeader = request.headers.get("authorization") || "";
    let userId: string | null = null;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();

      // 1) Try cron secret
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret && token === cronSecret) {
        userId = body.user_id || null;
        if (!userId) {
          return NextResponse.json({ error: "user_id required with cron-secret auth" }, { status: 400 });
        }
      } else {
        // 2) Try as Supabase JWT — verify via admin client
        const admin = createSupabaseAdminClient();
        const { data: { user } } = await admin.auth.getUser(token);
        if (user) {
          userId = user.id;
        } else {
          // 3) Try api_tokens table
          const { data } = await admin
            .from("api_tokens")
            .select("user_id")
            .eq("token", token)
            .single();
          if (data) {
            userId = data.user_id;
          }
        }
      }
    } else {
      // No Bearer — try Supabase session cookie
      const serverClient = await createSupabaseServerClient();
      const { data: { user } } = await serverClient.auth.getUser();
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    let alertContext: JobAlertContext;

    if (jobId) {
      const supabase = createSupabaseAdminClient();
      const { data: job } = await supabase
        .from("jobs")
        .select("id, upwork_job_id, title, url, budget, client_country")
        .eq("id", jobId)
        .single();

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      const { data: analysis } = await supabase
        .from("job_analyses")
        .select("match_score, opportunity_score, win_probability, recommendation, proposal_tips")
        .eq("job_id", jobId)
        .eq("user_id", userId)
        .single();

      alertContext = {
        jobId: job.id,
        upworkJobId: job.upwork_job_id,
        title: job.title || "Untitled",
        url: job.url || "",
        budget: job.budget ? `$${job.budget}` : undefined,
        country: job.client_country || undefined,
        matchScore: analysis?.match_score ?? 85,
        opportunityScore: analysis?.opportunity_score ?? 75,
        winProbability: analysis?.win_probability ?? 70,
        recommendation: analysis?.recommendation || "apply",
        proposalTips: (analysis?.proposal_tips as string[]) || ["Focus on your relevant experience", "Highlight similar projects", "Ask smart questions about scope"],
      };
    } else {
      alertContext = {
        jobId: "test",
        upworkJobId: "test_job_id",
        title: "Test Notification — Full Stack Developer Needed",
        url: "https://www.upwork.com/jobs/~test",
        budget: "$30-$50/hr",
        country: "United States",
        skills: ["React", "Node.js", "TypeScript", "PostgreSQL"],
        matchScore: 92,
        opportunityScore: 85,
        winProbability: 78,
        recommendation: "strong_apply",
        proposalTips: [
          "Lead with your React/Node experience",
          "Mention specific projects you've built",
          "Ask about their tech stack details",
        ],
      };
    }

    const results = await notifyUser(userId, alertContext);

    return NextResponse.json({
      ok: true,
      results,
      testMode: !jobId,
    });
  } catch (err: any) {
    console.error("[Notifications Send] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
