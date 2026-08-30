/**
 * Environment configuration — all values come from .env.local
 * App name is dynamically configurable without hardcoding.
 *
 * If required env vars are missing (e.g. in dev/build), we use dummy values
 * so the app can still build. Runtime operations that depend on real values
 * will fail gracefully with clear error messages.
 */

function getEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && url !== "your_supabase_url_here") return url;
  return "https://placeholder.supabase.co";
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (key && key !== "your_supabase_anon_key_here") return key;
  return "placeholder-key-for-build";
}

export const env = {
  // App
  APP_NAME: getEnv("NEXT_PUBLIC_APP_NAME", "UpScore"),
  APP_URL: getEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  // Supabase
  SUPABASE_URL: getSupabaseUrl(),
  SUPABASE_ANON_KEY: getSupabaseAnonKey(),
  SUPABASE_SERVICE_ROLE_KEY: getEnv("SUPABASE_SERVICE_ROLE_KEY"),

  // Auth
  SITE_URL: getEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),

  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL: getEnv("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: getEnv("UPSTASH_REDIS_REST_TOKEN"),

  // OpenAI
  OPENAI_API_KEY: getEnv("OPENAI_API_KEY"),
  OPENAI_MODEL: getEnv("OPENAI_MODEL", "gpt-4o-mini"),

  // Email (SMTP via Nodemailer)
  SMTP_HOST: getEnv("SMTP_HOST"),
  SMTP_PORT: parseInt(getEnv("SMTP_PORT", "465"), 10),
  SMTP_EMAIL: getEnv("SMTP_EMAIL"),
  SMTP_PASSWORD: getEnv("SMTP_PASSWORD"),
  SMTP_FROM: getEnv("SMTP_FROM"),

  // Legacy Resend (kept for backwards compat)
  RESEND_API_KEY: getEnv("RESEND_API_KEY"),
  RESEND_FROM_EMAIL: getEnv("RESEND_FROM_EMAIL", "noreply@upscore.app"),

  // Telegram
  TELEGRAM_BOT_TOKEN: getEnv("TELEGRAM_BOT_TOKEN"),

  // Job Fetching
  JOB_FETCHER_PROVIDER: getEnv("JOB_FETCHER_PROVIDER", "upalerts"),
  APIFY_API_KEY: getEnv("APIFY_API_KEY"),

  // UpAlerts
  UPALERTS_API_URL: getEnv("UPALERTS_API_URL", "https://upalerts.app/api/public/jobs"),

  // Slack Notifications
  SLACK_CLIENT_ID: getEnv("SLACK_CLIENT_ID"),
  SLACK_CLIENT_SECRET: getEnv("SLACK_CLIENT_SECRET"),
  SLACK_SIGNING_SECRET: getEnv("SLACK_SIGNING_SECRET"),

  // Cron
  CRON_SECRET: getEnv("CRON_SECRET"),

  // Upwork OAuth (app-side dynamic client for per-user connect).
  // Upwork's MCP uses OAuth 2.1 with dynamic client registration (RFC 7591),
  // so NO pre-registered client_id / client_secret is required — the app
  // registers a public client at runtime. Only the redirect URI + encryption
  // key are mandatory.
  UPWORK_DISCOVERY_URL: getEnv(
    "UPWORK_DISCOVERY_URL",
    "https://mcp.upwork.com/.well-known/oauth-authorization-server"
  ),
  UPWORK_CLIENT_ID: getEnv("UPWORK_CLIENT_ID"),
  UPWORK_CLIENT_SECRET: getEnv("UPWORK_CLIENT_SECRET"),
  UPWORK_REDIRECT_URI: getEnv("UPWORK_REDIRECT_URI"),
  // 32-byte AES key (base64) used to encrypt per-user tokens at rest
  UPWORK_TOKEN_ENCRYPTION_KEY: getEnv("UPWORK_TOKEN_ENCRYPTION_KEY"),
  UPWORK_MCP_URL: getEnv("UPWORK_MCP_URL", "https://mcp.upwork.com/mcp"),
  UPWORK_AUTH_URL: getEnv("UPWORK_AUTH_URL", "https://www.upwork.com/ab/account-security/oauth2/authorize"),
  UPWORK_TOKEN_URL: getEnv("UPWORK_TOKEN_URL", "https://www.upwork.com/api/v3/oauth2/token"),

  // Dynamic client registration is automatic via discovery. Configured only
  // when we have an encryption key + redirect URI (the token store essential).
  isUpworkConfigured:
    process.env.UPWORK_REDIRECT_URI !== "" &&
    process.env.UPWORK_REDIRECT_URI !== undefined &&
    process.env.UPWORK_TOKEN_ENCRYPTION_KEY !== "" &&
    process.env.UPWORK_TOKEN_ENCRYPTION_KEY !== undefined,

  // Is AI available?
  isAiConfigured:
    process.env.OPENAI_API_KEY !== "" &&
    process.env.OPENAI_API_KEY !== undefined &&
    process.env.OPENAI_API_KEY !== "your_openai_api_key_here",
  isApifyConfigured:
    process.env.APIFY_API_KEY !== "" &&
    process.env.APIFY_API_KEY !== undefined &&
    process.env.APIFY_API_KEY !== "your_apify_api_key_here",

  // Paddle
  PADDLE_CLIENT_TOKEN: getEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN"),
  PADDLE_ENV: getEnv("NEXT_PUBLIC_PADDLE_ENV", "sandbox"),
  PADDLE_WEBHOOK_SECRET: getEnv("PADDLE_WEBHOOK_SECRET"),
  PADDLE_MONTHLY_PRICE_ID: getEnv("NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID"),
  PADDLE_YEARLY_PRICE_ID: getEnv("NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID"),

  // Notifications
  isNotificationsConfigured:
    (process.env.SMTP_HOST !== "" && process.env.SMTP_HOST !== undefined) ||
    (process.env.RESEND_API_KEY !== "" && process.env.RESEND_API_KEY !== undefined),

  // Build/dev check — static dot notation for browser compatibility
  isSupabaseConfigured:
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url_here",
} as const;
