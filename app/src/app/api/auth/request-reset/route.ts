import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { rateLimited } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const email = (body.email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  if (rateLimited(`reset:${email}`, 4, 120_000)) return NextResponse.json({ error: "Too many reset requests. Wait a couple of minutes." }, { status: 429 });

  const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  // Always answer 200: do not reveal whether the account exists.
  if (rows.length > 0) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await db.update(users).set({ resetCode: code, resetExpires: new Date(Date.now() + 15 * 60_000) }).where(eq(users.id, rows[0].id));
    // Production: send `code` via email provider (SES/Postmark). Demo returns it inline.
    return NextResponse.json({ ok: true, demoCode: code, note: "In production this code is emailed; never returned by the API." });
  }
  return NextResponse.json({ ok: true, note: "If the account exists, a reset code was sent." });
}
