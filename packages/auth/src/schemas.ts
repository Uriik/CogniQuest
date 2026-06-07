/**
 * Zod schemas for auth boundaries. Used by NextAuth credentials, API routes
 * and the game-server. Password policy enforced here.
 */
import { z } from "zod";
import { GRADES } from "@cogniquest/shared";

/** Min 8 chars, at least one letter and one number. Tune as needed. */
export const passwordSchema = z
  .string()
  .min(8, "mínimo 8 caracteres")
  .max(128)
  .regex(/[A-Za-z]/, "precisa de letra")
  .regex(/[0-9]/, "precisa de número");

export const emailSchema = z.string().email().max(254).toLowerCase();

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(2).max(40),
  grade: z.enum(GRADES).optional(),
  turnstileToken: z.string().min(10),
});

export const otpCodeSchema = z.string().length(6).regex(/^\d{6}$/);

/**
 * Step 1 of 2FA login: verify password + captcha, then email an OTP.
 * Turnstile is checked here (not at the final step).
 */
export const requestOtpSchema = z.object({
  email: z.string().email(),
  turnstileToken: z.string().optional(),
});

/**
 * Step 2 of 2FA login: email + password + the 6-digit code sent by e-mail.
 * Consumed by the NextAuth Credentials provider.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
