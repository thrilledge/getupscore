import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id } = body;
    if (!user_id) return NextResponse.json({ error: "missing user_id" }, { status: 400 });

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.updateUserById(user_id, {
      app_metadata: { is_admin: true },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, user_id: data.user.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
