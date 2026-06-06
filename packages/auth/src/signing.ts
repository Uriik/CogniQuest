/**
 * HMAC signing for tamper-proof, expiring tokens (invites, email verification).
 * Zero external deps — uses node:crypto. Payload is base64url(JSON) + ".sig".
 *
 * SECURITY: constant-time comparison; signature covers the full payload incl.
 * expiry. A forged or modified token fails `verifySigned`.
 */
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const b64url = (buf: Buffer) => buf.toString("base64url");

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export interface SignedPayload<T> {
  data: T;
  exp: number; // unix seconds
}

/** Create a signed, expiring token carrying arbitrary JSON `data`. */
export function createSignedToken<T>(
  data: T,
  secret: string,
  ttlSeconds: number,
): string {
  const payload: SignedPayload<T> = {
    data,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}.${sign(body, secret)}`;
}

/** Verify signature + expiry. Returns the data or throws. */
export function verifySignedToken<T>(token: string, secret: string): T {
  const dot = token.lastIndexOf(".");
  if (dot < 0) throw new Error("malformed token");
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("bad signature");
  }

  const payload = JSON.parse(
    Buffer.from(body, "base64url").toString("utf8"),
  ) as SignedPayload<T>;
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("expired");
  }
  return payload.data;
}

/** Random numeric room code, default 6 digits, zero-padded. */
export function generateNumericCode(digits = 6): string {
  const max = 10 ** digits;
  return String(randomInt(0, max)).padStart(digits, "0");
}
