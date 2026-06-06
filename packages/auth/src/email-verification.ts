/**
 * Email verification + password-reset tokens. Built on the HMAC signer, so they
 * are stateless, tamper-proof and expiring. Carry only the userId + purpose.
 */
import { createSignedToken, verifySignedToken } from "./signing.js";

type Purpose = "verify-email" | "reset-password";

interface EmailTokenData {
  userId: string;
  purpose: Purpose;
}

const DEFAULT_TTL = 60 * 60 * 24; // 24h

export function createEmailToken(
  userId: string,
  purpose: Purpose,
  secret: string,
  ttlSeconds = DEFAULT_TTL,
): string {
  return createSignedToken<EmailTokenData>({ userId, purpose }, secret, ttlSeconds);
}

export function verifyEmailToken(
  token: string,
  purpose: Purpose,
  secret: string,
): string {
  const data = verifySignedToken<EmailTokenData>(token, secret);
  if (data.purpose !== purpose) throw new Error("wrong token purpose");
  return data.userId;
}
