/**
 * JWT access + refresh tokens (jose, HS256).
 *
 * - Access token: short-lived, carries userId. Sent in memory / Authorization.
 * - Refresh token: long-lived, rotated on every use. Stored in httpOnly cookie.
 *   Each refresh carries a `jti`; the server tracks the current valid jti per
 *   user in Redis so a stolen/old refresh can be revoked (rotation).
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { randomUUID } from "node:crypto";

const enc = new TextEncoder();

export interface TokenConfig {
  secret: string; // AUTH_SECRET
  accessTtlSeconds: number; // e.g. 900 (15 min)
  refreshTtlSeconds: number; // e.g. 2592000 (30 days)
  issuer?: string;
}

export interface AccessClaims extends JWTPayload {
  sub: string; // userId
  type: "access";
}

export interface RefreshClaims extends JWTPayload {
  sub: string; // userId
  type: "refresh";
  jti: string;
}

function key(secret: string) {
  return enc.encode(secret);
}

export async function signAccessToken(
  userId: string,
  cfg: TokenConfig,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(now + cfg.accessTtlSeconds)
    .setIssuer(cfg.issuer ?? "cogniquest")
    .sign(key(cfg.secret));
}

/** Returns the token and its jti (store the jti as the user's current refresh). */
export async function signRefreshToken(
  userId: string,
  cfg: TokenConfig,
): Promise<{ token: string; jti: string }> {
  const now = Math.floor(Date.now() / 1000);
  const jti = randomUUID();
  const token = await new SignJWT({ type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt(now)
    .setExpirationTime(now + cfg.refreshTtlSeconds)
    .setIssuer(cfg.issuer ?? "cogniquest")
    .sign(key(cfg.secret));
  return { token, jti };
}

export async function verifyAccessToken(
  token: string,
  cfg: TokenConfig,
): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, key(cfg.secret), {
    issuer: cfg.issuer ?? "cogniquest",
  });
  if (payload.type !== "access") throw new Error("wrong token type");
  return payload as AccessClaims;
}

export async function verifyRefreshToken(
  token: string,
  cfg: TokenConfig,
): Promise<RefreshClaims> {
  const { payload } = await jwtVerify(token, key(cfg.secret), {
    issuer: cfg.issuer ?? "cogniquest",
  });
  if (payload.type !== "refresh" || typeof payload.jti !== "string") {
    throw new Error("wrong token type");
  }
  return payload as RefreshClaims;
}
