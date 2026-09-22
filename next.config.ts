import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self' https://sandbox-buy.paddle.com https://buy.paddle.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.paddle.com https://sandbox-cdn.paddle.com",
      "style-src 'self' 'unsafe-inline' https://sandbox-cdn.paddle.com https://cdn.paddle.com",
      "img-src 'self' data: blob: https://www.getupscore.com https://lh3.googleusercontent.com https://sandbox-cdn.paddle.com https://cdn.paddle.com",
      "font-src 'self'",
      "connect-src 'self' https://db.getupscore.com wss://db.getupscore.com https://optimum-raven-68827.upstash.io https://sandbox.paddle.com https://api.paddle.com https://sandbox-cdn.paddle.com https://cdn.paddle.com",
      "frame-src 'self' https://sandbox-buy.paddle.com https://buy.paddle.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
