import { NextResponse } from "next/server";
import { verifySignedToken } from "@cogniquest/auth";
import { getDb, users, consents, auditLog, eq } from "@cogniquest/db";

export const dynamic = "force-dynamic";

interface ParentalTokenData {
  userId: string;
  childName: string;
}

const CURRENT_POLICY_VERSION = "v1.0";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token ausente" }, { status: 400 });
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Erro de configuração" }, { status: 500 });
    }

    let data: ParentalTokenData;
    try {
      data = verifySignedToken<ParentalTokenData>(token, secret);
    } catch {
      return NextResponse.json(
        { error: "Token inválido ou expirado. Solicite um novo cadastro." },
        { status: 400 },
      );
    }

    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.id, data.userId),
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (user.status === "active") {
      return NextResponse.json({ message: "Conta já está ativa", alreadyActive: true });
    }

    if (user.status !== "pending_parental") {
      return NextResponse.json({ error: "Status de conta inesperado" }, { status: 400 });
    }

    // Activate the account
    await db
      .update(users)
      .set({
        status: "active",
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, data.userId));

    // Record parental consent
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    await db.insert(consents).values({
      userId: data.userId,
      type: "parental",
      policyVersion: CURRENT_POLICY_VERSION,
      ip,
      method: "parental_email",
    });

    // Audit log
    await db.insert(auditLog).values({
      actorId: "guardian",
      action: "parental_consent_granted",
      target: `user:${data.userId}`,
      metadata: JSON.stringify({ childName: data.childName }),
    });

    return NextResponse.json({
      success: true,
      childName: data.childName,
      message: "Conta ativada com sucesso!",
    });
  } catch (err) {
    console.error("[PARENTAL CONSENT ERROR]", err);
    return NextResponse.json({ error: "Erro ao processar autorização" }, { status: 500 });
  }
}
