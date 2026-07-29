import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: the signed-in user's own inbox (strictly scoped by user_id). */
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const rows = await db.select().from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(40);
  const unread = rows.filter(r => r.status === "unread").length;
  return NextResponse.json({ notifications: rows, unread });
}

/** PATCH: mark one {id} or {all:true} as read — only rows owned by the caller. */
export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  let body: { id?: string; all?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  if (body.all) {
    await db.update(notifications).set({ status: "read" }).where(eq(notifications.userId, user.id));
  } else if (body.id) {
    // The AND on userId is what prevents cross-account writes.
    await db.update(notifications).set({ status: "read" })
      .where(and(eq(notifications.id, body.id), eq(notifications.userId, user.id)));
  }
  return NextResponse.json({ ok: true });
}
