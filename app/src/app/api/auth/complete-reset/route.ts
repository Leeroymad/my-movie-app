import { NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, rateLimited } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; code?: string; newPassword?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const email = (body.email || "").trim().toLowerCase();
  const code = (body.code || "").trim();
  const newPassword = body.newPassword || "";

  if (rateLimited(`reset-confirm:${email}`, 6, 120_000)) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  if (newPassword.length < 6) return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });

  const rows = await db.select().from(users)
    .where(and(eq(users.email, email), eq(users.resetCode, code), gt(users.resetExpires, new Date())))
    .limit(1);
  if (rows.length === 0) return NextResponse.json({ error: "Invalid or expired reset code." }, { status: 400 });

  await db.update(users)
    .set({ passwordHash: await hashPassword(newPassword), resetCode: null, resetExpires: null })
    .where(eq(users.id, rows[0].id));

  return NextResponse.json({ ok: true });
}
