import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const MAX_CONTRACTS = 50;

/**
 * POST /api/extension/contracts/sync
 * Receive contracts captured from Upwork by the extension.
 * Upserts by upwork_contract_id.
 *
 * Headers: Authorization: Bearer <token>
 *
 * Body: { contracts: Array<{ upwork_contract_id, title, client_name,
 *        client_url, client_rating, type, status, hourly_rate,
 *        fixed_price, total_hours, total_earned, started_at, ended_at }> }
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user_id as string;

  try {
    const body = await request.json();
    let { contracts } = body;

    if (!Array.isArray(contracts) || contracts.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    if (contracts.length > MAX_CONTRACTS) {
      contracts = contracts.slice(0, MAX_CONTRACTS);
    }

    const supabase = createSupabaseAdminClient();
    let syncedCount = 0;

    for (const contract of contracts) {
      const upworkContractId = String(contract.upwork_contract_id || "").trim();
      if (!upworkContractId || !contract.title) continue;

      const record: Record<string, unknown> = {
        user_id: userId,
        upwork_contract_id: upworkContractId,
        title: String(contract.title).slice(0, 500),
        client_name: contract.client_name ? String(contract.client_name).slice(0, 200) : null,
        client_url: contract.client_url ? String(contract.client_url).slice(0, 1000) : null,
        client_rating: contract.client_rating ? parseFloat(contract.client_rating) : null,
        type: contract.type === "fixed" ? "fixed" : "hourly",
        status: contract.status === "closed" || contract.status === "cancelled" ? contract.status : "active",
        hourly_rate: contract.hourly_rate ? parseFloat(contract.hourly_rate) : null,
        fixed_price: contract.fixed_price ? parseFloat(contract.fixed_price) : null,
        total_hours: contract.total_hours ? parseFloat(contract.total_hours) : null,
        total_earned: contract.total_earned ? parseFloat(contract.total_earned) : null,
        started_at: contract.started_at ? new Date(contract.started_at).toISOString() : null,
        ended_at: contract.ended_at ? new Date(contract.ended_at).toISOString() : null,
      };

      const { error } = await supabase
        .from("contracts")
        .upsert(record, {
          onConflict: "upwork_contract_id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.warn("[Extension Contracts] Upsert error:", error.message);
        continue;
      }

      syncedCount++;
    }

    return NextResponse.json({ count: syncedCount });
  } catch (err) {
    console.error("[Extension Contracts] Error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
