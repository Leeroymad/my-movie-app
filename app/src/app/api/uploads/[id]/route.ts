import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { publishedMovies, processingJobs } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE: remove your own upload. Owners and admins only — checked server-side. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;

  const rows = await db.select().from(publishedMovies).where(eq(publishedMovies.id, id)).limit(1);
  if (rows.length === 0) return NextResponse.json({ error: "Upload not found" }, { status: 404 });

  const isOwner = rows[0].userId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden: you can only delete your own uploads" }, { status: 403 });

  try {
    await unlink(path.join(process.cwd(), "uploads", "videos", path.basename(rows[0].videoFile)));
  } catch { /* file may already be gone */ }

  await db.delete(processingJobs).where(eq(processingJobs.movieId, id));
  await db.delete(publishedMovies).where(eq(publishedMovies.id, id));
  return NextResponse.json({ ok: true });
}
