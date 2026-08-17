import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Just trigger the Inngest function — it handles fetch, upsert, analyze, notify
    await inngest.send({ name: "app/cron.trigger", data: {} });

    return NextResponse.json({
      ok: true,
      message: "Cron triggered via Inngest",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Cron] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
