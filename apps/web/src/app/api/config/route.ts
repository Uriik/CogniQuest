import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    gameServerUrl: process.env.GAME_SERVER_URL || "",
    wsSecret: process.env.WS_SECRET || "",
  });
}
