/**
 * Email notification sender via Nodemailer (SMTP).
 *
 * Config: { to: string }
 */
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

export interface EmailConfig {
  to: string;
}

export interface EmailPayload {
  subject: string;
  text: string;
  html?: string;
}

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_EMAIL,
      pass: env.SMTP_PASSWORD,
    },
  });

  return _transporter;
}

export async function sendEmail(
  config: EmailConfig,
  payload: EmailPayload
): Promise<{ ok: boolean; error?: string }> {
  if (!env.SMTP_HOST || !env.SMTP_EMAIL || !env.SMTP_PASSWORD) {
    return { ok: false, error: "SMTP not configured" };
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: env.SMTP_FROM || env.SMTP_EMAIL,
      to: config.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html || payload.text.replace(/\n/g, "<br>"),
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
