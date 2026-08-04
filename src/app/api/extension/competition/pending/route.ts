import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const STALE_AFTER_DAYS = 7;
const BATCH_SIZE = 12;

// Fallback list used only if the get_market_trends RPC is not yet deployed.
const FALLBACK_SKILLS = [
  "React",
  "Python",
  "JavaScript",
  "Node.js",
  "Next.js",
  "TypeScript",
  "AI",
  "Machine Learning",
  "Web Design",
  "SEO",
  "Copywriting",
  "Data Analysis",
];

/**
 * GET /api/extension/competition/pending
 * Returns the top in-demand skills (by job mentions) that lack a fresh
 * talent-search freelancer count. The extension checks these one at a time
 * on Upwork and posts snapshots back to POST /api/extension/competition/sync.
 *
 * Headers: Authorization: Bearer <token>
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createSupabaseAdminClient();

  // 1. Top skills by demand (reuses the market-trends RPC).
  let topSkills: string[] = [];
  try {
    const { data } = await supabase.rpc("get_market_trends", { p_days: 30 });
    const skills = (data as { skills?: Array<{ name?: string }> } | null)?.skills;
    if (Array.isArray(skills)) {
      topSkills = skills.map((s) => s?.name).filter(Boolean) as string[];
    }
  } catch {
    // RPC not available — fall through to the curated list.
  }
  if (topSkills.length === 0) {
    topSkills = FALLBACK_SKILLS;
  }

  // 2. Last captured timestamp per skill.
  const cutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentRows } = await supabase
    .from("skill_competition")
    .select("skill")
    .gte("captured_at", cutoff);

  const freshSkills = new Set<string>((recentRows || []).map((r: any) => r.skill));

  // 3. Return only skills without a fresh capture.
  const pending = topSkills.filter((name) => !freshSkills.has(name)).slice(0, BATCH_SIZE);

  return NextResponse.json({ skills: pending, staleAfterDays: STALE_AFTER_DAYS });
}
