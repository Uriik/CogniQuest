import { NextResponse } from "next/server";
import {
  requestOtpSchema,
  verifyPassword,
  verifyTurnstile,
  checkRateLimit,
  RedisKvStore,
  rateKey,
  generateOtp,
  hashOtp,
  otpKey,
  OTP_TTL_SECONDS,
} from "@cogniquest/auth";
import { sendOtpEmail } from "@cogniquest/auth/mailer";
import { getDb, users, getRedisClient } from "@cogniquest/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * 2FA step 1. Validates password + Turnstile, then e-mails a 6-digit OTP.
 * Always returns { ok: true } (no account enumeration); the e-mail is sent
 * only when credentials are valid.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = requestOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const { email, turnstileToken } = parsed.data;

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const redis = getRedisClient();
    const kv = new RedisKvStore(redis);
    const limit = await checkRateLimit(kv, rateKey("request-otp", ip), {
      max: 5,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
    }

    if (process.env.TURNSTILE_SECRET_KEY && turnstileToken) {
      const t = await verifyTurnstile(turnstileToken, process.env.TURNSTILE_SECRET_KEY);
      if (!t.success) {
        return NextResponse.json({ error: "Captcha inválido" }, { status: 400 });
      }
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret) return NextResponse.json({ error: "Server misconfig" }, { status: 500 });

    const db = getDb();
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });

    if (user) {
      const code = generateOtp();
      await redis.set(otpKey(email), hashOtp(code, secret), "EX", OTP_TTL_SECONDS);
      await sendOtpEmail(email, code);
    }

    // Generic response regardless of whether the e-mail was sent.
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Erro ao enviar código" }, { status: 500 });
  }
}
