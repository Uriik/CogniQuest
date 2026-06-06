import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { cookies } from "next/headers";
import { signAccessToken } from "@cogniquest/auth";

export async function GET(req: NextRequest) {
  // Apenas rodar em ambientes de teste
  if (process.env.NODE_ENV === "production" && !process.env.E2E_TESTING) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Usar um UUID válido para não quebrar a query do banco de dados (users.id é uuid)
  const userId = "12345678-1234-1234-1234-123456789012";
  const authSecret = process.env.AUTH_SECRET || "troque-isto-por-um-segredo-forte";

  const accessToken = await signAccessToken(userId, { secret: authSecret, accessTtlSeconds: 900, refreshTtlSeconds: 2592000 });

  const token = await encode({
    token: {
      name: "Playwright Tester",
      email: "test@playwright.com",
      id: userId,
      accessToken,
      accessTokenExpires: Date.now() + 900 * 1000,
    },
    secret: authSecret,
    salt: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
  });

  const cookieName = process.env.NODE_ENV === "production" 
    ? "__Secure-authjs.session-token" 
    : "authjs.session-token";

  cookies().set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ success: true, token });
}
