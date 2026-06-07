import { NextResponse } from "next/server";
import { registerSchema, hashPassword, verifyTurnstile, createSignedToken, checkRateLimit, RATE_RULES, RedisKvStore, rateKey } from "@cogniquest/auth";
import { getDb, users, consents, auditLog, getRedisClient } from "@cogniquest/db";
import { checkText } from "@cogniquest/shared";

export const dynamic = "force-dynamic";

import { sendWelcomeEmail, sendParentalConsentEmail } from "@cogniquest/auth/mailer";

/** Derive age category from birthdate string (YYYY-MM-DD). */
function getAgeCategory(birthdate: string): "child" | "teen" | "adult" {
  const birth = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  if (age < 12) return "child";
  if (age < 18) return "teen";
  return "adult";
}

const CURRENT_POLICY_VERSION = "v1.0";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error }, { status: 400 });
    }

    const { email, password, displayName, grade, turnstileToken, birthdate, guardianEmail } = parsed.data;

    // ── Moderation: validate display name ──
    const nameCheck = checkText(displayName, { fieldLabel: "Nome de exibição", minLength: 2, maxLength: 40 });
    if (!nameCheck.ok) {
      return NextResponse.json({ error: nameCheck.reason }, { status: 400 });
    }

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

    // ── Age category & parental flow ──
    // Todo menor de 18 (criança OU adolescente) exige consentimento parental.
    const ageCategory = getAgeCategory(birthdate);
    const isMinor = ageCategory !== "adult";

    if (isMinor && !guardianEmail) {
      return NextResponse.json(
        { error: "Para menores de 18 anos, o e-mail do responsável é obrigatório." },
        { status: 400 }
      );
    }

    if (isMinor && guardianEmail?.toLowerCase() === email.toLowerCase()) {
      return NextResponse.json(
        { error: "O e-mail do responsável não pode ser igual ao seu próprio e-mail." },
        { status: 400 }
      );
    }

    // Menor → conta pendente até o responsável autorizar; adulto → ativa.
    const accountStatus = isMinor ? "pending_parental" : "active";

    const hashedPassword = await hashPassword(password);
    const db = getDb();

    const [user] = await db.insert(users).values({
      email,
      passwordHash: hashedPassword,
      displayName,
      grade: grade ?? null,
      emailVerifiedAt: accountStatus === "active" ? new Date() : null,
      birthdate,
      guardianEmail: guardianEmail ?? null,
      status: accountStatus,
    }).returning();

    // ── Record consents ──
    await db.insert(consents).values([
      {
        userId: user.id,
        type: "terms",
        policyVersion: CURRENT_POLICY_VERSION,
        ip,
        method: "registration_form",
      },
      {
        userId: user.id,
        type: "privacy_policy",
        policyVersion: CURRENT_POLICY_VERSION,
        ip,
        method: "registration_form",
      },
    ]);

    // ── Audit log ──
    await db.insert(auditLog).values({
      actorId: user.id,
      action: "account_created",
      target: `user:${user.id}`,
      metadata: JSON.stringify({ ageCategory, status: accountStatus }),
    });

    // ── Parental consent flow for minors (< 18) ──
    if (isMinor && guardianEmail) {
      try {
        const secret = process.env.AUTH_SECRET;
        if (!secret) throw new Error("Missing AUTH_SECRET");
        const token = createSignedToken(
          { userId: user.id, childName: displayName },
          secret,
          72 * 3600, // 72h to confirm
        );
        const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";
        const confirmLink = `${baseUrl}/parental-consent?token=${encodeURIComponent(token)}`;
        await sendParentalConsentEmail(guardianEmail, displayName, confirmLink);
      } catch (emailErr) {
        console.error("[PARENTAL EMAIL ERROR]", emailErr);
        // Account created but email failed — log it
      }

      return NextResponse.json({
        success: true,
        pendingParental: true,
        message: "Conta criada! Um e-mail foi enviado ao responsável para autorização.",
      });
    }

    // ── Welcome email for active accounts ──
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
