import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { publishedMovies, processingJobs, notifications } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  if (user.role !== "admin") return { error: NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 }) };
  return { user };
}

/** PATCH: edit metadata or change status (flag / unpublish / re-publish). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  let body: { title?: string; genre?: string; synopsis?: string; status?: string; year?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim().slice(0, 120);
  if (typeof body.genre === "string" && body.genre.trim()) updates.genre = body.genre.slice(0, 40);
  if (typeof body.synopsis === "string") updates.synopsis = body.synopsis.slice(0, 600);
  if (typeof body.year === "number") updates.year = Math.min(2030, Math.max(1900, body.year));
  if (body.status && ["processing", "published", "flagged", "unpublished"].includes(body.status)) updates.status = body.status;

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const rows = await db.update(publishedMovies).set(updates).where(eq(publishedMovies.id, id)).returning();
  if (rows.length === 0) return NextResponse.json({ error: "Upload not found" }, { status: 404 });

  // Alert the owner when moderation changes visibility
  const row = rows[0];
  if (body.status && body.status !== "published" && row.userId) {
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: row.userId,
      kind: "alert",
      title: body.status === "flagged" ? "Your upload was flagged" : "Your upload was unpublished",
      body: `“${row.title}” is temporarily hidden by moderation (${body.status}). Contact support if you believe this is a mistake.`,
    });
  }

  return NextResponse.json({ ok: true, movie: row });
}

/** DELETE: remove the upload, its file, and its jobs. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const rows = await db.select().from(publishedMovies).where(eq(publishedMovies.id, id)).limit(1);
  if (rows.length === 0) return NextResponse.json({ error: "Upload not found" }, { status: 404 });

  try {
    await unlink(path.join(process.cwd(), "uploads", "videos", path.basename(rows[0].videoFile)));
  } catch { /* file may already be gone */ }

  await db.delete(processingJobs).where(eq(processingJobs.movieId, id));
  await db.delete(publishedMovies).where(eq(publishedMovies.id, id));
  return NextResponse.json({ ok: true });
}
