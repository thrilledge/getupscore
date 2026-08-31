import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { getUpworkSession } from "@/lib/upwork/session";
import { getProfile, normalizeMcpProfile } from "@/lib/upwork/mcp";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("upwork_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If the extension hasn't synced a profile for this user but they have an
  // active Upwork connection, pull the live profile via the Upwork MCP so the
  // profile page still shows complete data.
  let profile: Record<string, unknown> | null = data ?? null;
  if (!profile && env.isUpworkConfigured) {
    try {
      const session = await getUpworkSession(user.id);
      if (session) {
        const mcpProfile = normalizeMcpProfile(
          await getProfile(session.token.access_token, env.UPWORK_MCP_URL, session.orgUid)
        );
        if (mcpProfile) profile = mcpProfile;
      }
    } catch (e) {
      console.warn("upwork-profile GET live profile fallback failed", e);
    }
  }

  return NextResponse.json({ profile });
}

export async function PUT(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("upwork_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let result;
  if (existing) {
    result = await admin
      .from("upwork_profiles")
      .update(body)
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await admin
      .from("upwork_profiles")
      .insert({ user_id: user.id, ...body })
      .select()
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: result.data });
}
