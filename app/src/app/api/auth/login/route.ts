import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, createSession, ensureAdminSeed, rateLimited } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ensureAdminSeed();
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  if (rateLimited(`login:${email}:${request.headers.get("x-forwarded-for") || "local"}`)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Same error for unknown email vs wrong password: no account enumeration.
  if (rows.length === 0 || !(await verifyPassword(password, rows[0].passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const u = rows[0];
  const cookie = await createSession(u.id);
  return NextResponse.json(
    { user: { id: u.id, email: u.email, name: u.name, role: u.role } },
    { headers: { "Set-Cookie": cookie } }
  );
}
