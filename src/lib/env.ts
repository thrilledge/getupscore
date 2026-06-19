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
  // Use static dot notation so Next.js inlines the value at compile time
  // (bracket notation process.env["..."] is NOT replaced by DefinePlugin in browser bundles)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && url !== "your_supabase_url_here") return url;
  // Return a dummy for build/SSR — actual usage will fail gracefully
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

  // Redis
  REDIS_URL: getEnv("REDIS_URL", "redis://localhost:6379"),

  // OpenAI
  OPENAI_API_KEY: getEnv("OPENAI_API_KEY"),
  OPENAI_MODEL: getEnv("OPENAI_MODEL", "gpt-4o-mini"),

  // Email
  RESEND_API_KEY: getEnv("RESEND_API_KEY"),
  RESEND_FROM_EMAIL: getEnv("RESEND_FROM_EMAIL", "noreply@upscore.app"),

  // Telegram
  TELEGRAM_BOT_TOKEN: getEnv("TELEGRAM_BOT_TOKEN"),

  // Job Fetching
  JOB_FETCHER_PROVIDER: getEnv("JOB_FETCHER_PROVIDER", "mock"),
  APIFY_API_KEY: getEnv("APIFY_API_KEY"),

  // Cron
  CRON_SECRET: getEnv("CRON_SECRET"),

  // Is AI available?
  isAiConfigured:
    process.env.OPENAI_API_KEY !== "" &&
    process.env.OPENAI_API_KEY !== undefined &&
    process.env.OPENAI_API_KEY !== "your_openai_api_key_here",
  isApifyConfigured:
    process.env.APIFY_API_KEY !== "" &&
    process.env.APIFY_API_KEY !== undefined &&
    process.env.APIFY_API_KEY !== "your_apify_api_key_here",

  // Notifications
  isNotificationsConfigured:
    process.env.RESEND_API_KEY !== "" &&
    process.env.RESEND_API_KEY !== undefined,

  // Build/dev check — static dot notation for browser compatibility
  isSupabaseConfigured:
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url_here",
} as const;
