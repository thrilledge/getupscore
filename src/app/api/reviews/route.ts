import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_NAME = 80;
const MAX_ROLE = 160;
const MAX_MESSAGE = 2000;
const MIN_MESSAGE = 10;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * GET /api/reviews
 * Public: returns approved reviews for the landing page, newest first.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") ?? "6", 10) || 6)
    );

    const { data, error } = await supabase
      .from("reviews")
      .select("id, name, role, rating, message, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ ok: true, reviews: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 * Public: submit a review. Always stored as "pending" and shown on the
 * landing page only after admin approval.
 */
export async function POST(req: NextRequest) {
  const rate = await checkRateLimit(apiRateLimit, `review:${getClientIp(req)}`);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Too many review submissions. Try again in a minute." },
      { status: 429 }
    );
  }

  let body: { name?: string; role?: string; rating?: number; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const role = String(body.role ?? "").trim();
  const rating = Number(body.rating);
  const message = String(body.message ?? "").trim();

  if (!name || name.length > MAX_NAME) {
    return NextResponse.json(
      { error: `Name is required (max ${MAX_NAME} characters)` },
      { status: 400 }
    );
  }
  if (role.length > MAX_ROLE) {
    return NextResponse.json(
      { error: `Role must be under ${MAX_ROLE} characters` },
      { status: 400 }
    );
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 5" },
      { status: 400 }
    );
  }
  if (message.length < MIN_MESSAGE || message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: `Review must be ${MIN_MESSAGE}-${MAX_MESSAGE} characters` },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("reviews")
      .insert({ name, role: role || null, rating, message })
      .select("id, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json(
      { ok: true, review: data },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}