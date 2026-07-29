import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { publishedMovies, users, processingJobs } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every admin API re-verifies the session AND the role server-side. Hiding the
 *  link in the UI is cosmetic; this check is the actual authorization boundary. */
async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  if (user.role !== "admin") return { error: NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 }) };
  return { user };
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const movies = await db.select().from(publishedMovies).orderBy(desc(publishedMovies.createdAt));
  const allUsers = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt })
    .from(users);
  const jobs = await db.select().from(processingJobs).orderBy(desc(processingJobs.createdAt)).limit(100);

  const userById = new Map(allUsers.map(u => [u.id, u]));
  const jobByMovie = new Map<string, { status: string; stage: string; progress: number }>();
  for (const j of jobs) if (!jobByMovie.has(j.movieId)) jobByMovie.set(j.movieId, { status: j.status, stage: j.stage, progress: j.progress });

  return NextResponse.json({
    uploads: movies.map(m => {
      const owner = m.userId ? userById.get(m.userId) : null;
      return { ...m, ownerEmail: owner?.email ?? null, ownerName: owner?.name ?? null, job: jobByMovie.get(m.id) ?? null };
    }),
    users: allUsers,
  });
}
