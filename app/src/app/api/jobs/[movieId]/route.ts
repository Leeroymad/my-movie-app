import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { processingJobs, publishedMovies } from "@/db/schema";
import { processQueue } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Job status for the movie page pipeline UI. Re-kicks the worker if the job is stuck queued. */
export async function GET(_request: Request, { params }: { params: Promise<{ movieId: string }> }) {
  const { movieId } = await params;
  const jobs = await db.select().from(processingJobs)
    .where(eq(processingJobs.movieId, movieId))
    .orderBy(desc(processingJobs.createdAt))
    .limit(1);
  if (jobs.length === 0) return NextResponse.json({ job: null });

  const job = jobs[0];
  if (job.status === "queued") void processQueue().catch(() => {});

  let movie = null;
  if (job.status === "done" || job.status === "failed") {
    const rows = await db.select().from(publishedMovies).where(eq(publishedMovies.id, movieId)).limit(1);
    if (rows.length > 0) {
      const r = rows[0];
      movie = { status: r.status, variants: r.variants };
    }
  }
  return NextResponse.json({ job: { ...job, movie } });
}
