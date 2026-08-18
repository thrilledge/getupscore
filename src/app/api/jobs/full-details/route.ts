import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EC2_API = "http://13.48.204.110";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ciphertext } = await request.json();
    if (!ciphertext) {
      return NextResponse.json({ error: "ciphertext required" }, { status: 400 });
    }

    const ec2Resp = await fetch(
      `${EC2_API}/jobs/${encodeURIComponent(ciphertext)}/full`,
      { method: "POST", headers: { "Content-Type": "application/json" } }
    );

    if (!ec2Resp.ok) {
      return NextResponse.json({ error: "Upstream service error" }, { status: 502 });
    }

    const data = await ec2Resp.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
