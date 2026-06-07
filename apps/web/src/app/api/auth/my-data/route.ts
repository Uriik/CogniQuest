import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, users, matches, consents, dataRequests, auditLog, eq } from "@cogniquest/db";
import { getRedisClient } from "@cogniquest/db";

export const dynamic = "force-dynamic";

/** GET /api/auth/my-data — Export all user data (LGPD Art. 18 — portability). */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.user.id;
    const db = getDb();

    // Fetch user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Fetch related data
    const userMatches = await db.query.matches.findMany({
      where: (m, { or }) => or(eq(m.hostId, userId), eq(m.guestId, userId)),
    });

    const userConsents = await db.query.consents.findMany({
      where: eq(consents.userId, userId),
    });

    // Build export
    const exportData = {
      exportedAt: new Date().toISOString(),
      policyVersion: "v1.0",
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        grade: user.grade,
        birthdate: user.birthdate,
        status: user.status,
        createdAt: user.createdAt,
      },
      consents: userConsents.map((c) => ({
        type: c.type,
        policyVersion: c.policyVersion,
        grantedAt: c.grantedAt,
        method: c.method,
      })),
      matches: userMatches.map((m) => ({
        id: m.id,
        gameType: m.gameType,
        role: m.hostId === userId ? "host" : "guest",
        grade: m.grade,
        status: m.status,
        winnerId: m.winnerId,
        startedAt: m.startedAt,
        finishedAt: m.finishedAt,
      })),
    };

    // Record data access request
    await db.insert(dataRequests).values({
      userId,
      type: "portability",
      status: "completed",
      resolvedAt: new Date(),
    });

    // Audit log
    await db.insert(auditLog).values({
      actorId: userId,
      action: "data_exported",
      target: `user:${userId}`,
    });

    return NextResponse.json(exportData);
  } catch (err) {
    console.error("[MY-DATA GET ERROR]", err);
    return NextResponse.json({ error: "Erro ao exportar dados" }, { status: 500 });
  }
}

/** DELETE /api/auth/my-data — Delete account (LGPD Art. 18 — deletion). */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.user.id;
    const db = getDb();

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (user.anonymizedAt) {
      return NextResponse.json({ error: "Conta já foi excluída" }, { status: 400 });
    }

    // ── Anonymise user data (soft-delete) ──
    const anonymisedEmail = `deleted-${userId.substring(0, 8)}@anon.cogniquest.local`;
    const anonymisedName = `Usuário Removido`;

    await db
      .update(users)
      .set({
        email: anonymisedEmail,
        displayName: anonymisedName,
        passwordHash: "ANONYMISED",
        grade: null,
        birthdate: null,
        guardianEmail: null,
        status: "suspended",
        anonymizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // ── Record DSAR ──
    await db.insert(dataRequests).values({
      userId,
      type: "deletion",
      status: "completed",
      resolvedAt: new Date(),
    });

    // ── Audit log ──
    await db.insert(auditLog).values({
      actorId: userId,
      action: "account_deleted",
      target: `user:${userId}`,
      metadata: JSON.stringify({ method: "self-service" }),
    });

    // ── Purge Redis data ──
    try {
      const redis = getRedisClient();
      // Purge room association
      const roomId = await redis.get(`user:${userId}:room`);
      if (roomId) {
        await redis.del(`user:${userId}:room`);
        await redis.del(`room:${roomId}:ready:${userId}`);
      }
      // Purge any refresh token JTIs (best effort)
    } catch {
      // Redis cleanup failure is non-fatal
    }

    return NextResponse.json({ success: true, message: "Conta excluída com sucesso." });
  } catch (err) {
    console.error("[MY-DATA DELETE ERROR]", err);
    return NextResponse.json({ error: "Erro ao excluir conta" }, { status: 500 });
  }
}
