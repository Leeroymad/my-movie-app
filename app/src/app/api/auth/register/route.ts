import { NextResponse } from "next/server";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, notifications } from "@/db/schema";
import { hashPassword, createSession, ensureAdminSeed, rateLimited } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ensureAdminSeed();
  let body: { email?: string; password?: string; name?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const name = (body.name || "").trim().slice(0, 60) || "Member";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  if (rateLimited(`reg:${email}`)) return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });

  const id = crypto.randomUUID();
  await db.insert(users).values({ id, email, passwordHash: await hashPassword(password), name, role: "user" });

  // Per-user scoped welcome notification
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    userId: id,
    kind: "welcome",
    title: `Welcome to Cinema Stream, ${name}`,
    body: "Your account is ready. Publish a film and we'll auto-grade it, or browse the community catalog. Processing updates will land in this inbox.",
  });

  const cookie = await createSession(id);
  return NextResponse.json({ user: { id, email, name, role: "user" } }, { status: 201, headers: { "Set-Cookie": cookie } });
}
