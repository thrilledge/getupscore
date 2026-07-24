import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    SMTP_HOST: env.SMTP_HOST || "(empty)",
    SMTP_PORT: env.SMTP_PORT,
    SMTP_EMAIL: env.SMTP_EMAIL || "(empty)",
    SMTP_PASSWORD: env.SMTP_PASSWORD ? "***set***" : "(empty)",
    SMTP_FROM: env.SMTP_FROM || "(empty)",
    isNotificationsConfigured: env.isNotificationsConfigured,
    raw_SMTP_HOST: process.env.SMTP_HOST || "(empty)",
  });
}
