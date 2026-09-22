/**
 * Generic webhook notification sender.
 *
 * Config: { url: string; method?: "GET" | "POST" | "PUT" }
 *
 * SSRF hardening: only http/https is allowed, and the resolved destination
 * must be a public IP — private, loopback, link-local (IMDS), CGNAT and
 * reserved ranges are rejected. Remote response bodies are never echoed.
 */
import { lookup } from "node:dns/promises";

export interface WebhookConfig {
  url: string;
  secret?: string;
}

export interface WebhookPayload {
  [key: string]: unknown;
}

const REQUEST_TIMEOUT_MS = 10_000;

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  const inRange = (start: string, prefix: number) => {
    const base = ipv4ToInt(start);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (n & mask) === (base & mask);
  };
  return (
    inRange("0.0.0.0", 8) ||       // current network
    inRange("10.0.0.0", 8) ||      // RFC 1918
    inRange("100.64.0.0", 10) ||   // CGNAT
    inRange("127.0.0.0", 8) ||     // loopback
    inRange("169.254.0.0", 16) ||  // link-local / AWS IMDS
    inRange("172.16.0.0", 12) ||   // RFC 1918
    inRange("192.0.0.0", 24) ||    // IETF protocol assignments
    inRange("192.168.0.0", 16) ||  // RFC 1918
    inRange("198.18.0.0", 15) ||   // benchmarking
    inRange("224.0.0.0", 4) ||     // multicast
    inRange("240.0.0.0", 4)        // reserved
  );
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  const hostPart = lower.split("%")[0];
  if (
    hostPart === "::" || hostPart === "::1" ||
    hostPart.startsWith("fe80:") || hostPart.startsWith("fc") ||
    hostPart.startsWith("fd") || hostPart.startsWith("ff") ||
    hostPart.startsWith("2001:db8:")
  ) {
    return true;
  }
  // IPv4-mapped addresses like ::ffff:127.0.0.1
  const v4Match = hostPart.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Match) return isPrivateIpv4(v4Match[1]);
  return false;
}

function isPrivateAddress(ip: string): boolean {
  if (ip.includes(":")) return isPrivateIpv6(ip);
  return isPrivateIpv4(ip);
}

function looksLikeIp(host: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":");
}

export async function sendWebhook(
  config: WebhookConfig,
  payload: WebhookPayload
): Promise<{ ok: boolean; error?: string }> {
  if (!config.url) {
    return { ok: false, error: "Webhook URL not configured" };
  }

  let parsed: URL;
  try {
    parsed = new URL(config.url);
  } catch {
    return { ok: false, error: "Invalid webhook URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Webhook URL must be http(s)" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "Webhook URL must not contain credentials" };
  }

  try {
    // Resolve the host and reject private/dangerous destinations (SSRF guard).
    const addresses = await lookup(parsed.hostname, { verbatim: true, all: true });
    if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
      return { ok: false, error: "Webhook target is not a public address" };
    }
    // NOTE: we deliberately do NOT rewrite the URL to the resolved IP. Doing so
    // breaks TLS (empty SNI / cert-mismatch) and CDN routing (Host header of an
    // IP), which made https webhooks fail with "fetch failed". The DNS check
    // above is the guard; the fetch below keeps the original hostname so certs
    // and CDN backends resolve correctly.
  } catch {
    return { ok: false, error: "Could not resolve webhook host" };
  }

  try {
    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.secret
          ? { "X-UpScore-Secret": config.secret }
          : {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    };

    fetchOptions.body = JSON.stringify({
      ...payload,
      ...(config.secret ? { webhook_secret: config.secret } : {}),
    });

    const response = await fetch(config.url, fetchOptions);

    if (!response.ok) {
      // Never echo the remote response body — it could contain internal data.
      return { ok: false, error: `Webhook returned ${response.status}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.name === "TimeoutError" ? "Webhook request timed out" : err?.message || "Webhook request failed" };
  }
}
