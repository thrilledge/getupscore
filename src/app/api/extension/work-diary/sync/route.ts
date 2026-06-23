import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const MAX_ENTRIES = 100;

/**
 * POST /api/extension/work-diary/sync
 * Receive work diary entries captured from Upwork by the extension.
 * Matches contracts by upwork_contract_id, then upserts by (user_id, contract_id, date).
 *
 * Headers: Authorization: Bearer <token>
 *
 * Body: { entries: Array<{ upwork_contract_id, date, hours_worked, notes,
 *        screenshot_count, activity_level }> }
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user_id as string;

  try {
    const body = await request.json();
    let { entries } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(0, MAX_ENTRIES);
    }

    const supabase = createSupabaseAdminClient();

    // Collect all unique upwork_contract_ids from entries
    const upworkContractIds = [
      ...new Set(entries.map((e: Record<string, unknown>) => String(e.upwork_contract_id || "").trim()).filter(Boolean)),
    ];

    // Resolve to local contract UUIDs
    const { data: contractMap } = await supabase
      .from("contracts")
      .select("id, upwork_contract_id")
      .in("upwork_contract_id", upworkContractIds)
      .eq("user_id", userId);

    const idByUpworkId: Record<string, string> = {};
    if (contractMap) {
      for (const c of contractMap) {
        if (c.upwork_contract_id) idByUpworkId[c.upwork_contract_id] = c.id;
      }
    }

    let syncedCount = 0;

    for (const entry of entries) {
      const upworkContractId = String(entry.upwork_contract_id || "").trim();
      const localContractId = idByUpworkId[upworkContractId];
      if (!localContractId) continue;

      const date = entry.date ? new Date(entry.date).toISOString().split("T")[0] : null;
      if (!date) continue;

      const hoursWorked = parseFloat(entry.hours_worked);
      if (!hoursWorked || hoursWorked <= 0) continue;

      const record: Record<string, unknown> = {
        user_id: userId,
        contract_id: localContractId,
        date,
        hours_worked: hoursWorked,
        notes: entry.notes ? String(entry.notes).slice(0, 2000) : null,
        screenshot_count: entry.screenshot_count ? parseInt(entry.screenshot_count, 10) : null,
        activity_level: entry.activity_level ? Math.max(0, Math.min(100, parseInt(entry.activity_level, 10))) : null,
      };

      const { error } = await supabase
        .from("work_diary_entries")
        .upsert(record, {
          onConflict: "user_id, contract_id, date",
          ignoreDuplicates: false,
        });

      if (error) {
        console.warn("[Extension Work Diary] Upsert error:", error.message);
        continue;
      }

      syncedCount++;
    }

    return NextResponse.json({ count: syncedCount });
  } catch (err) {
    console.error("[Extension Work Diary] Error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
