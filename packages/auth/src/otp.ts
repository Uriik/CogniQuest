/**
 * Email 2FA one-time codes (OTP).
 *
 * Only a HMAC hash of the code is stored (in Redis), never the plaintext.
 * Codes are short-lived and single-use (the route deletes the key on success).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { generateNumericCode } from "./signing.js";

/** OTP lifetime in seconds. */
export const OTP_TTL_SECONDS = 300; // 5 min

/** Redis key for the current OTP hash of an email. */
export const otpKey = (email: string) => `otp:${email.toLowerCase()}`;

/** Redis key tracking failed OTP attempts (lockout). */
export const otpAttemptsKey = (email: string) => `otp:attempts:${email.toLowerCase()}`;

/** Max wrong attempts before the code is invalidated. */
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtp(): string {
  return generateNumericCode(6);
}

export function hashOtp(code: string, secret: string): string {
  return createHmac("sha256", secret).update(code).digest("base64url");
}

/** Constant-time comparison of a candidate code against a stored hash. */
export function verifyOtp(code: string, storedHash: string, secret: string): boolean {
  const a = Buffer.from(hashOtp(code, secret));
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}
