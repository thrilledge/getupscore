/**
 * POST /api/whatsapp/connect
 *
 * Connects the current user's WhatsApp notification channel using this
 * product's shared OpenWA session. The user provides only their phone
 * number. The real session ID is resolved server-side and stored in the
 * channel config; the OpenWA base URL + API key are read from env at send
 * time, so the master key never touches the database.
 *
 * Multi-product: each product deployment defines its own OPENWA_* env vars,
 * so the same route supports different sessions per product without code
 * changes.
 *
 * Auth: Supabase session cookie, Bearer JWT, or Bearer api token.
 * Body: { phone: string }
 * Response: { channel, sessionConnected }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/whatsapp/auth";
import {
  OPENWA_SESSION_ID,
  isSessionReachable,
} from "@/lib/whatsapp/openwa-client";

const phoneRegex = /^\+?[1-9]\d{6,14}$/;
const BodySchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Phone must be 7-15 digits with optional +"),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid phone" },
        { status: 400 }
      );
    }

    const phoneDigits = parsed.data.phone.replace(/\D/g, "");

    // Resolve the real session ID — OpenWA only accepts the UUID in
    // message routes, not the session name.
    const sessionCheck = await isSessionReachable(OPENWA_SESSION_ID);
    if (!sessionCheck.ok) {
      return NextResponse.json({ error: sessionCheck.error }, { status: 502 });
    }
    if (!sessionCheck.session.id) {
      return NextResponse.json(
        { error: "WhatsApp session not found for this product" },
        { status: 500 }
      );
    }
    const sessionConnected = sessionCheck.connected;

    const admin = createSupabaseAdminClient();

    // Reconnect must UPDATE the existing WhatsApp channel in place, not
    // delete + insert: notification_rules.channel_id cascades on channel
    // delete, so replacing the row would silently wipe the user's rules and
    // the test-send flow would then report "No matching rules for this
    // channel".
    const { data: existingWhatsApp } = await admin
      .from("notification_channels")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("type", "whatsapp")
      .order("created_at", { ascending: false });

    const rows = existingWhatsApp ?? [];
    const canonicalId = rows[0]?.id ?? null;
    const staleIds = rows.slice(1).map((row) => row.id);

    const nextConfig = {
      phone: phoneDigits,
      session_id: sessionCheck.session.id,
    };

    let channel: { id: string; name: string; type: string } | null = null;

    if (canonicalId) {
      // Fold duplicate WhatsApp rows into the canonical one so their rules
      // survive the cleanup instead of being cascade-deleted.
      if (staleIds.length > 0) {
        await admin
          .from("notification_rules")
          .update({ channel_id: canonicalId })
          .eq("user_id", userId)
          .in("channel_id", staleIds);

        await admin
          .from("notification_channels")
          .delete()
          .eq("user_id", userId)
          .in("id", staleIds);
      }

      const { data, error } = await admin
        .from("notification_channels")
        .update({
          config: nextConfig,
          is_active: true,
          is_verified: sessionConnected,
        })
        .eq("id", canonicalId)
        .select("id, name, type")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      channel = data;
    } else {
      const { data, error } = await admin
        .from("notification_channels")
        .insert({
          user_id: userId,
          name: "WhatsApp",
          type: "whatsapp",
          config: nextConfig,
          is_active: true,
          is_verified: sessionConnected,
        })
        .select("id, name, type")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      channel = data;
    }

    return NextResponse.json({ channel, sessionConnected });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: message || "Failed to connect WhatsApp" },
      { status: 500 }
    );
  }
}