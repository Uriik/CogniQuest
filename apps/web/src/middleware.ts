import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildCsp, SECURITY_HEADERS } from "@/lib/security-headers";

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    // Apply to all paths except static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
