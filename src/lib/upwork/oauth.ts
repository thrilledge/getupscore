/**
 * Upwork OAuth2 (Authorization Code + PKCE) for per-user connect via the
 * Upwork MCP.
 *
 * Upwork's MCP (mcp.upwork.com/mcp) uses OAuth 2.1 with DYNAMIC CLIENT
 * REGISTRATION (RFC 7591). There is NO pre-registered static client/secret —
 * the app registers a public client (no secret) against Upwork's registration
 * endpoint, then runs the auth-code + PKCE flow per user.
 *
 * Flow:
 *   1. discover()  → GET https://mcp.upwork.com/.well-known/oauth-authorization-server
 *   2. registerDynamicClient() → POST registration_endpoint (public client)
 *   3. /connect/start builds authorize URL (PKCE S256 + state) for that client
 *   4. user approves on Upwork → redirect to /connect/callback with `code`
 *   5. exchangeCodeForToken() → token via token_endpoint (no secret needed)
 *   6. store encrypted tokens per user (upwork_connections)
 *
 * Discovery doc (live, 2026):
 *   issuer      https://mcp.upwork.com
 *   registration_endpoint https://www.upwork.com/register
 *   authorization_endpoint https://www.upwork.com/ab/account-security/oauth2/authorize
 *   token_endpoint https://www.upwork.com/api/v3/oauth2/token
 *   token_endpoint_auth_methods_supported ["none", ...]  → public client
 *   code_challenge_methods_supported ["S256"]
 */
import { createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/** RFC 8414 authorization server metadata for the Upwork MCP. */
export interface UpworkAuthMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint?: string;
  registration_endpoint?: string;
  code_challenge_methods_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  grant_types_supported?: string[];
  scopes_supported?: string[];
}

export const UPWORK_DISCOVERY_URL =
  "https://mcp.upwork.com/.well-known/oauth-authorization-server";

/**
 * Fetch the OAuth authorization server metadata. Cached in a module-level var
 * so repeated connects don't re-hit discovery every time.
 */
let cachedMetadata: UpworkAuthMetadata | null = null;

export async function discoverAuthMetadata(
  force = false
): Promise<UpworkAuthMetadata> {
  if (cachedMetadata && !force) return cachedMetadata;
  const resp = await fetch(env.UPWORK_DISCOVERY_URL ?? UPWORK_DISCOVERY_URL);
  if (!resp.ok) {
    throw new Error(
      `Upwork OAuth discovery failed (${resp.status}) — is the MCP OAuth flow available?`
    );
  }
  cachedMetadata = (await resp.json()) as UpworkAuthMetadata;
  return cachedMetadata;
}

/** A dynamically-registered public client (RFC 7591). */
export interface RegisteredClient {
  client_id: string;
  client_secret?: string;
  client_id_issued_at?: number;
  client_secret_expires_at?: number;
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
  redirect_uris?: string[];
}

/**
 * Register (or refresh) a public dynamic client for our redirect URI.
 *
 * Public clients have NO client_secret (token_endpoint_auth_method "none"),
 * which is what Upwork's MCP supports. The returned client_id is stable for a
 * given redirect_uri, so we register once and cache by redirect uri.
 */
export async function registerDynamicClient(
  redirectUri = env.UPWORK_REDIRECT_URI,
  force = false
): Promise<RegisteredClient> {
  const meta = await discoverAuthMetadata();
  if (!meta.registration_endpoint) {
    throw new Error("Upwork OAuth: no dynamic client registration endpoint");
  }

  // Re-registration of the same public client (same redirect_uri, same
  // signing params) returns the same client_id in most RFC 7591 servers; but
  // to avoid churn we cache after the first successful registration.
  if (cachedClientId && !force && cachedClientRedirect === redirectUri) {
    return { client_id: cachedClientId, token_endpoint_auth_method: "none" };
  }

  const body = {
    redirect_uris: [redirectUri],
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    application_type: "web",
    client_name: env.APP_NAME || "UpScore",
  };

  const resp = await fetch(meta.registration_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Upwork dynamic client registration failed (${resp.status}): ${text}`
    );
  }

  const client = (await resp.json()) as RegisteredClient;
  if (!client.client_id) {
    throw new Error("Upwork dynamic client registration returned no client_id");
  }

  if (cachedClientId === client.client_id) {
    // Same client re-registered — keep as-is.
  } else if (!cachedClientId) {
    cachedClientId = client.client_id;
    cachedClientRedirect = redirectUri;
    console.warn(
      `[upwork] registered dynamic client ${client.client_id} for ${redirectUri}`
    );
  }

  return client;
}

let cachedClientId: string | null = null;
let cachedClientRedirect: string | null = null;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** Generate a PKCE code_verifier (43-128 chars, unreserved chars) and its S256 challenge. */
export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(48)); // 64 chars
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return base64url(randomBytes(24));
}

export interface AuthorizeParams {
  state: string;
  codeChallenge: string;
  clientId: string;
  scopes?: string[];
}

export async function buildAuthorizeUrl(
  params: AuthorizeParams
): Promise<string> {
  const meta = await discoverAuthMetadata();
  const url = new URL(meta.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", env.UPWORK_REDIRECT_URI);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  const scopes = params.scopes?.length ? params.scopes : ["hr_contracts_actions_manage"];
  url.searchParams.set("scope", scopes.join(" "));
  return url.toString();
}

export interface TokenResponse extends Record<string, unknown> {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
}

async function tokenRequest(
  tokenEndpoint: string,
  body: URLSearchParams
): Promise<TokenResponse> {
  // Public client (dynamic registration, token_endpoint_auth_method "none") —
  // no Authorization header / secret needed; the client_id rides in the body.
  const resp = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Upwork token request failed (${resp.status}): ${text}`);
  }
  return (await resp.json()) as TokenResponse;
}

export interface ExchangeArgs {
  code: string;
  codeVerifier: string;
  clientId: string;
}

export async function exchangeCodeForToken(
  args: ExchangeArgs
): Promise<TokenResponse> {
  const meta = await discoverAuthMetadata();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: env.UPWORK_REDIRECT_URI,
    code_verifier: args.codeVerifier,
    client_id: args.clientId,
  });
  return tokenRequest(meta.token_endpoint, body);
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string
): Promise<TokenResponse> {
  const meta = await discoverAuthMetadata();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  return tokenRequest(meta.token_endpoint, body);
}
