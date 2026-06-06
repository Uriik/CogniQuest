import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildCsp, SECURITY_HEADERS } from "@/lib/security-headers";

export async function middleware(request: NextRequest) {
  // Generate nonce for CSP
  const nonce = crypto.randomUUID();
  
  const csp = buildCsp(nonce, {
    gameServerOrigin: process.env.GAME_SERVER_URL || "http://localhost:3001",
    enableTurnstile: true,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", csp);
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Basic edge check for /api/auth routes
  if (request.nextUrl.pathname.startsWith("/api/auth/")) {
    // Note: Rate-limiting using Redis typically requires @upstash/redis on Edge.
    // For now, we apply basic validation or placeholder rate-limit logic.
    // Real Redis integration for Memorystore requires a proxy or Edge-compatible REST endpoint.
    
    // const ip = request.ip || "127.0.0.1";
    // TODO: implement checkRateLimit with an Edge-compatible KvStore
  }

  return response;
}

export const config = {
  matcher: [
    // Apply to all paths except static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
