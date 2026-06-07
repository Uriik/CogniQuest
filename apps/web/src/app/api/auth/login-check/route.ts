import { NextResponse } from "next/server";
import { loginSchema, verifyPassword, checkRateLimit, RATE_RULES, RedisKvStore, rateKey } from "@cogniquest/auth";
import { getDb, users, getRedisClient, eq } from "@cogniquest/db";

export const dynamic = "force-dynamic";

/**
 * Pré-checagem de login. Existe porque o NextAuth v5 mascara a mensagem lançada
 * pelo `authorize` (devolve sempre um erro genérico), o que fazia uma conta
 * bloqueada (ex.: menor aguardando consentimento parental) aparecer como "senha
 * incorreta". Aqui devolvemos o MOTIVO real — mas só após validar a senha, para
 * não virar um oráculo que revela status de conta por e-mail.
 *
 * Importante: não cria sessão. Contas pendentes/suspensas continuam sem acesso
 * (a sessão só é emitida pelo fluxo normal do NextAuth quando o status é "ok").
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const redis = getRedisClient();
    const kv = new RedisKvStore(redis);

    // Bucket próprio para não consumir o limite do login real do NextAuth.
    const limit = await checkRateLimit(kv, rateKey("login_check", ip), RATE_RULES.login);
    if (!limit.allowed) {
      return NextResponse.json({ status: "rate_limited" });
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ status: "invalid" });
    }

    const { email, password } = parsed.data;
    const db = getDb();
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });

    // Credencial inválida → resposta genérica (não revela se o e-mail existe).
    if (!user || !user.passwordHash) {
      return NextResponse.json({ status: "invalid" });
    }
    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) {
      return NextResponse.json({ status: "invalid" });
    }

    // Senha correta: agora sim podemos revelar o motivo do bloqueio.
    if (user.anonymizedAt) return NextResponse.json({ status: "anonymized" });
    if (user.status === "suspended") return NextResponse.json({ status: "suspended" });
    if (user.status === "pending_parental") return NextResponse.json({ status: "pending_parental" });

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[LOGIN CHECK ERROR]", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
