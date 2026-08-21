import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["draft", "running", "paused", "completed"];
const STATUS_ACTIONS: Record<string, string> = {
  start: "running",
  pause: "paused",
  complete: "completed",
};

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

    const { data: tests, error: testsError } = await admin
      .from("ab_tests")
      .select("*")
      .order("created_at", { ascending: false });

    if (testsError) throw testsError;

    // Assignment counts per test/variant
    const { data: assignments, error: assignError } = await admin
      .from("ab_test_assignments")
      .select("test_id, variant");

    if (assignError) throw assignError;

    const countsByTest: Record<string, Record<string, number>> = {};
    (assignments ?? []).forEach((a: any) => {
      if (!countsByTest[a.test_id]) countsByTest[a.test_id] = {};
      countsByTest[a.test_id][a.variant] = (countsByTest[a.test_id][a.variant] ?? 0) + 1;
    });

    return NextResponse.json({
      ok: true,
      tests: (tests ?? []).map((t: any) => ({
        ...t,
        variant_counts: countsByTest[t.id] ?? {},
        total_assignments: Object.values(countsByTest[t.id] ?? {}).reduce(
          (sum: number, n) => sum + n,
          0
        ),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch A/B tests" }, { status: 500 });
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
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : null;
    const variants = Array.isArray(body?.variants) ? body.variants : [];

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (variants.length < 2) {
      return NextResponse.json(
        { error: "At least 2 variants are required" },
        { status: 400 }
      );
    }

    const cleanedVariants = variants
      .map((v: any) => ({
        name: typeof v?.name === "string" ? v.name.trim().slice(0, 100) : "",
        weight:
          typeof v?.weight === "number" && Number.isFinite(v.weight)
            ? Math.max(0, Math.min(100, v.weight))
            : 0,
      }))
      .filter((v: { name: string }) => v.name.length > 0);

    if (cleanedVariants.length < 2) {
      return NextResponse.json(
        { error: "At least 2 named variants are required" },
        { status: 400 }
      );
    }

    const totalWeight = cleanedVariants.reduce(
      (sum: number, v: { weight: number }) => sum + v.weight,
      0
    );
    if (totalWeight !== 100) {
      return NextResponse.json(
        { error: `Variant weights must sum to 100 (currently ${totalWeight})` },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient() as any;
    const { data, error } = await admin
      .from("ab_tests")
      .insert({
        name: name.slice(0, 200),
        description: description?.slice(0, 2000) || null,
        status: "draft",
        variants: cleanedVariants,
      })
      .select()
      .single();

    if (error) {
      if ((error as any).code === "23505") {
        return NextResponse.json(
          { error: "A test with this name already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ ok: true, test: data });
  } catch {
    return NextResponse.json({ error: "Failed to create A/B test" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { testId, action } = body ?? {};

    if (!testId || typeof testId !== "string") {
      return NextResponse.json({ error: "testId is required" }, { status: 400 });
    }
    const newStatus = STATUS_ACTIONS[action];
    if (!newStatus) {
      return NextResponse.json(
        { error: 'action must be one of "start", "pause", "complete"' },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === "running") update.start_date = new Date().toISOString();
    if (newStatus === "completed") update.end_date = new Date().toISOString();

    const admin = createSupabaseAdminClient() as any;
    const { data, error } = await admin
      .from("ab_tests")
      .update(update)
      .eq("id", testId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, test: data });
  } catch {
    return NextResponse.json({ error: "Failed to update A/B test" }, { status: 500 });
  }
}
