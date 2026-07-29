import { NextResponse } from "next/server";
import { getSessionUser, ensureAdminSeed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureAdminSeed();
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user });
}
