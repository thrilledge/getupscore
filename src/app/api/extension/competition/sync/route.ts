import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const MAX_SKILLS_PER_REQUEST = 50;

/**
 * POST /api/extension/competition/sync
 * Store freelancer-count snapshots captured by the extension from Upwork
 * talent search pages (https://www.upwork.com/nx/search/talent/?q=<skill>).
 *
 * Headers: Authorization: Bearer <token>
 * Body:
 *   { skills: Array<{ skill: string, freelancerCount: number }> }
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    let { skills } = body;
    if (!Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    if (skills.length > MAX_SKILLS_PER_REQUEST) {
      skills = skills.slice(0, MAX_SKILLS_PER_REQUEST);
    }

    const supabase = createSupabaseAdminClient();
    const rows: Array<{
      skill: string;
      freelancer_count: number;
      source: string;
      captured_at: string;
    }> = [];
    const seen = new Set<string>();

    for (const entry of skills) {
      const name = String(entry?.skill || "").trim().slice(0, 200);
      const freelancerCount = Number(entry?.freelancerCount);
      if (!name || seen.has(name)) continue;
      if (!Number.isFinite(freelancerCount) || freelancerCount < 0) continue;
      seen.add(name);
      rows.push({
        skill: name,
        freelancer_count: Math.round(freelancerCount),
        source: String(entry?.source || "extension_talent").slice(0, 50),
        captured_at: new Date().toISOString(),
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const { error } = await supabase.from("skill_competition").insert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: rows.length });
  } catch (err) {
    console.error("[Extension Competition] Error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
