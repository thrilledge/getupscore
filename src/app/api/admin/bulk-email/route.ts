import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const VALID_SEGMENTS = ["all", "free", "pro", "churned", "active", "inactive_7d", "inactive_30d"];

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const admin = createSupabaseAdminClient() as any;
    const { data: campaigns, error } = await admin
      .from("bulk_email_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, campaigns: campaigns ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const admin = createSupabaseAdminClient() as any;

    // ── Send an existing campaign ───────────────────────────
    if (body?.action === "send" && typeof body.campaignId === "string") {
      const { data: campaign, error: fetchError } = await admin
        .from("bulk_email_campaigns")
        .select("*")
        .eq("id", body.campaignId)
        .single();

      if (fetchError || !campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      // Count recipients based on target_segment
      let recipientCount = 0;
      try {
        const segment = campaign.target_segment ?? "all";
        const { count } = await countRecipients(admin, segment);
        recipientCount = count ?? 0;
      } catch {
        recipientCount = 0;
      }

      // Mark as sent (real SMTP sending is complex — placeholder)
      const { error: updateError } = await admin
        .from("bulk_email_campaigns")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          total_recipients: recipientCount,
          sent_count: 0,
        })
        .eq("id", body.campaignId);

      if (updateError) throw updateError;

      return NextResponse.json({
        ok: true,
        message: "Campaign marked as sent (SMTP not configured)",
      });
    }

    // ── Create a new campaign ───────────────────────────────
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const emailBody = typeof body?.body === "string" ? body.body.trim() : "";
    const targetSegment =
      typeof body?.target_segment === "string" && VALID_SEGMENTS.includes(body.target_segment)
        ? body.target_segment
        : null;

    if (!name || !subject || !emailBody) {
      return NextResponse.json(
        { error: "name, subject and body are required" },
        { status: 400 }
      );
    }
    if (!targetSegment) {
      return NextResponse.json({ error: "Invalid target_segment" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("bulk_email_campaigns")
      .insert({
        name: name.slice(0, 200),
        subject: subject.slice(0, 500),
        body: emailBody.slice(0, 50000),
        target_segment: targetSegment,
        status: "draft",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, campaign: data });
  } catch {
    return NextResponse.json({ error: "Failed to process campaign request" }, { status: 500 });
  }
}

async function countRecipients(admin: any, segment: string): Promise<{ count: number | null }> {
  switch (segment) {
    case "pro": {
      const { count } = await admin
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      return { count };
    }
    case "churned": {
      const { count } = await admin
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "canceled");
      return { count };
    }
    case "free": {
      const { data: subs } = await admin.from("subscriptions").select("user_id").eq("status", "active");
      const proIds = new Set((subs ?? []).map((s: any) => s.user_id));
      const { count: totalUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
      return { count: Math.max(0, (totalUsers?.total ?? 0) - proIds.size) };
    }
    case "inactive_7d":
    case "inactive_30d": {
      const days = segment === "inactive_7d" ? 7 : 30;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("users")
        .select("*", { count: "exact", head: true })
        .lt("last_sign_in_at", cutoff);
      return { count };
    }
    default: {
      const { count } = await admin.from("users").select("*", { count: "exact", head: true });
      return { count };
    }
  }
}
