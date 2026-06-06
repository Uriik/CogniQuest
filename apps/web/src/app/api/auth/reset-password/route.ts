import { NextResponse } from "next/server";
import {
  checkRateLimit,
  RedisKvStore,
  rateKey,
  verifyOtp,
  otpKey,
  otpAttemptsKey,
  OTP_MAX_ATTEMPTS,
  hashPassword,
} from "@cogniquest/auth";
import { getDb, users, getRedisClient } from "@cogniquest/db";
import { eq } from "@cogniquest/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const { email, otp, newPassword } = parsed.data;

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const redis = getRedisClient();
    const kv = new RedisKvStore(redis);
    const limit = await checkRateLimit(kv, rateKey("reset-password", ip), {
      max: 5,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret) return NextResponse.json({ error: "Server misconfig" }, { status: 500 });

    const storedHash = await redis.get(otpKey(email));
    if (!storedHash) {
      return NextResponse.json({ error: "Código expirado ou não solicitado" }, { status: 400 });
    }

    const attempts = await redis.incr(otpAttemptsKey(email));
    if (attempts === 1) await redis.expire(otpAttemptsKey(email), 300);
    if (attempts > OTP_MAX_ATTEMPTS) {
      await redis.del(otpKey(email));
      await redis.del(otpAttemptsKey(email));
      return NextResponse.json({ error: "Muitas tentativas. Solicite um novo código." }, { status: 400 });
    }

    if (!verifyOtp(otp, storedHash, secret)) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    const db = getDb();
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await db.update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.email, email));

    // Single-use: consume the OTP on success.
    await redis.del(otpKey(email));
    await redis.del(otpAttemptsKey(email));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[RESET PASSWORD ERROR]", err);
    return NextResponse.json({ error: "Erro ao redefinir senha" }, { status: 500 });
  }
}
