import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EC2_API = "http://13.48.204.110";

export async function POST(request: Request) {
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
      const err = await ec2Resp.text().catch(() => "EC2 error");
      return NextResponse.json({ error: err }, { status: 502 });
    }

    const data = await ec2Resp.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
