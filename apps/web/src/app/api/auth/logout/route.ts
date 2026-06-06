import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("refresh_token");
  // TODO: remove jti from Redis to revoke session
  return response;
}
