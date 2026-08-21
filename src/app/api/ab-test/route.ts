import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/ab-test?testName=xxx
 * Returns the variant assigned to the current user (or assigns one).
 * Used by frontend to check which variant a user is in.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const testName = searchParams.get("testName");
  if (!testName) {
    return NextResponse.json({ error: "testName required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient() as any;

  // Find the running test
  const { data: test } = await admin
    .from("ab_tests")
    .select("*")
    .eq("name", testName)
    .eq("status", "running")
    .single();

  if (!test) {
    return NextResponse.json({ ok: true, assigned: false, variant: null });
  }

  // Check if user already has an assignment
  const { data: existing } = await admin
    .from("ab_test_assignments")
    .select("variant")
    .eq("test_id", test.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ ok: true, assigned: true, variant: existing.variant, testName });
  }

  // Assign user to a variant based on weights
  const variants = test.variants as { name: string; weight: number }[];
  if (!variants?.length) {
    return NextResponse.json({ ok: true, assigned: false, variant: null });
  }

  const roll = Math.random() * 100;
  let cumulative = 0;
  let selectedVariant = variants[0].name;

  for (const v of variants) {
    cumulative += v.weight;
    if (roll < cumulative) {
      selectedVariant = v.name;
      break;
    }
  }

  // Save assignment
  await admin.from("ab_test_assignments").insert({
    test_id: test.id,
    user_id: user.id,
    variant: selectedVariant,
  });

  return NextResponse.json({ ok: true, assigned: true, variant: selectedVariant, testName });
}
