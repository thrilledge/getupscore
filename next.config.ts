import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App name is configured via NEXT_PUBLIC_APP_NAME in .env.local
  // No hardcoded app name here

  // Enable React strict mode for development
  reactStrictMode: true,
};

export default nextConfig;
