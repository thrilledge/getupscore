/**
 * Encrypt/decrypt per-user Upwork OAuth token payloads at rest (AES-256-GCM).
 * The key comes from UPWORK_TOKEN_ENCRYPTION_KEY (a base64 32-byte value) and
 * is kept only server-side — it is never exposed to the client.
 *
 * Output format stores the base64 ciphertext along with its base64 IV and auth
 * tag, which the DB stores in the token_enc / token_iv / token_tag columns.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

export interface EncryptedToken {
  tokenEnc: string;
  tokenIv: string;
  tokenTag: string;
}

function keyBuffer(): Buffer {
  const key = env.UPWORK_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("UPWORK_TOKEN_ENCRYPTION_KEY is not configured");
  }
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) {
    throw new Error("UPWORK_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte secret");
  }
  return buf;
}

export function encryptToken(plaintext: string): EncryptedToken {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuffer(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    tokenEnc: enc.toString("base64"),
    tokenIv: iv.toString("base64"),
    tokenTag: tag.toString("base64"),
  };
}

export function decryptToken(encrypted: EncryptedToken): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyBuffer(),
    Buffer.from(encrypted.tokenIv, "base64")
  );
  decipher.setAuthTag(Buffer.from(encrypted.tokenTag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(encrypted.tokenEnc, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

export interface UpworkTokenPayload {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
  token_type?: string;
  scope?: string;
}

export function encodeTokenPayload(payload: UpworkTokenPayload): EncryptedToken {
  return encryptToken(JSON.stringify(payload));
}

export function decodeTokenPayload(encrypted: EncryptedToken): UpworkTokenPayload {
  return JSON.parse(decryptToken(encrypted)) as UpworkTokenPayload;
}
