import { NextResponse } from "next/server";
import { registerSchema, hashPassword, verifyTurnstile, createEmailToken, checkRateLimit, RATE_RULES, RedisKvStore, rateKey } from "@cogniquest/auth";
import { getDb, users, getRedisClient } from "@cogniquest/db";

export const dynamic = "force-dynamic";

import { sendWelcomeEmail } from "@cogniquest/auth/mailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error }, { status: 400 });
    }

    const { email, password, displayName, ageBand, turnstileToken } = parsed.data;

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const redis = getRedisClient();
    const kvStore = new RedisKvStore(redis);
    const limit = await checkRateLimit(kvStore, rateKey("register", ip), RATE_RULES.register);
    
    if (!limit.allowed) {
      return NextResponse.json({ error: "Rate limit excedido" }, { status: 429 });
    }

    if (process.env.TURNSTILE_SECRET_KEY) {
      const turnstileValid = await verifyTurnstile(turnstileToken, process.env.TURNSTILE_SECRET_KEY);
      if (!turnstileValid.success) {
        return NextResponse.json({ error: "Captcha inválido" }, { status: 400 });
      }
    }

    const hashedPassword = await hashPassword(password);
    const db = getDb();

    const [user] = await db.insert(users).values({
      email,
      passwordHash: hashedPassword,
      displayName,
      ageBand: ageBand ?? null,
      emailVerifiedAt: new Date(),
    }).returning();

    await sendWelcomeEmail(user.email, user.displayName).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[REGISTER ERROR]", err);
    if (err.code === "23505") {
      return NextResponse.json({ error: "Email in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error", details: String(err) }, { status: 500 });
  }
}
