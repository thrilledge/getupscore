import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * POST /api/coupons/validate
 * Public endpoint — validates a coupon code for the current user.
 */
export async function POST(request: Request) {
  try {
    const rate = await checkRateLimit(apiRateLimit, `coupon:${getClientIp(request)}`);
    if (!rate.success) {
      return NextResponse.json({ valid: false, error: "Too many attempts. Try again in a minute." }, { status: 429 });
    }

    const body = await request.json();
    const { code, plan } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, error: "Coupon code is required" }, { status: 400 });
    }

    // Get user if logged in (optional)
    let userId: string | null = null;
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Not logged in — still validate for preview
    }

    const admin = createSupabaseAdminClient() as any;

    // Escape ILIKE wildcards so user input can never pattern-match multiple
    // coupons ("%", "SUMMER%") and leak full codes of coupons that exist.
    const escaped = String(code).trim().replace(/[%_\\]/g, (ch) => `\\${ch}`);

    // Find coupon
    const { data: coupon } = await admin
      .from("coupons")
      .select("*")
      .ilike("code", escaped)
      .eq("active", true)
      .single();

    if (!coupon) {
      return NextResponse.json({ valid: false, error: "Invalid coupon code" });
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "This coupon has expired" });
    }

    // Check start date
    if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) {
      return NextResponse.json({ valid: false, error: "This coupon is not active yet" });
    }

    // Check max uses
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ valid: false, error: "This coupon has reached its usage limit" });
    }

    // Check plan restriction
    if (coupon.allowed_plans?.length && plan && !coupon.allowed_plans.includes(plan)) {
      return NextResponse.json({ valid: false, error: "This coupon is not valid for this plan" });
    }

    // Check per-user usage
    if (userId && coupon.max_uses_per_user) {
      const { count } = await admin
        .from("coupon_usages")
        .select("*", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("user_id", userId);

      if (count >= coupon.max_uses_per_user) {
        return NextResponse.json({ valid: false, error: "You have already used this coupon" });
      }
    }

    return NextResponse.json({
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      description: coupon.description,
    });
  } catch {
    return NextResponse.json({ valid: false, error: "Failed to validate coupon" }, { status: 500 });
  }
}
