import { NextResponse } from "next/server";
import { verifyEmailToken } from "@cogniquest/auth";

export const dynamic = "force-dynamic";
import { getDb, users } from "@cogniquest/db";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token || !process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  try {
    const userId = verifyEmailToken(token, "verify-email", process.env.AUTH_SECRET);
    const db = getDb();
    
    await db.update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, userId));

    return NextResponse.redirect(new URL("/login?verified=1", req.url));
  } catch {
    return NextResponse.json({ error: "Expired or invalid token" }, { status: 400 });
  }
}
