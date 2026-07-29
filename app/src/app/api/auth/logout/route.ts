import { NextResponse } from "next/server";
import { destroySession, clearCookieHeader } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await destroySession(request);
  return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": clearCookieHeader } });
}
