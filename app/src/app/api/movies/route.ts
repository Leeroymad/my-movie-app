import { NextResponse } from "next/server";
import { desc, and, ne } from "drizzle-orm";
import { db } from "@/db";
import { publishedMovies, users } from "@/db/schema";
import { movies as builtinMovies, Movie, MB } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let community: Movie[] = [];
  try {
    const rows = await db.select().from(publishedMovies)
      .where(and(ne(publishedMovies.status, "unpublished"), ne(publishedMovies.status, "flagged")))
      .orderBy(desc(publishedMovies.createdAt));
    const owners = await db.select({ id: users.id, name: users.name }).from(users);
    const nameById = new Map(owners.map(u => [u.id, u.name]));

    community = rows.map(r => ({
      id: r.id,
      title: r.title,
      year: r.year,
      rating: parseFloat(r.rating) || 7.5,
      runtime: r.runtime,
      synopsis: r.synopsis,
      cast: r.cast,
      genre: r.genre,
      poster: r.poster,
      video: `/api/stream/${r.videoFile}`,
      sizeMB: Math.round(Number(r.srcSizeBytes) / MB),
      sourceKind: "community" as const,
      uploadedBy: (r.userId && nameById.get(r.userId)) || r.uploadedBy,
      userId: r.userId,
      status: r.status as Movie["status"],
      detected: {
        quality: r.detectedQuality,
        width: r.srcWidth,
        height: r.srcHeight,
        codec: r.codec,
        durationSec: parseFloat(r.durationSec) || 0,
      },
      variants: r.variants,
    }));
  } catch (e) {
    console.error("Failed to load community movies:", e);
  }

  return NextResponse.json({ movies: [...community, ...builtinMovies] });
}
