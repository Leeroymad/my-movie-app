import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { db } from "@/db";
import { publishedMovies, notifications, VariantRow } from "@/db/schema";
import { MB } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { enqueueJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Meta {
  width: number; height: number; durationSec: number; codec: string; quality: string;
}

export async function POST(request: Request) {
  let fd: FormData;
  try {
    fd = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const video = fd.get("video");
  if (!video || typeof video === "string" || !(video instanceof File) || video.size === 0) {
    return NextResponse.json({ error: "A video file is required" }, { status: 400 });
  }

  const title = String(fd.get("title") || "").trim().slice(0, 120);
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  // Signed-in users publish under their own account; guests may still publish.
  const user = await getSessionUser(request);

  const meta: Meta = (() => {
    try { return JSON.parse(String(fd.get("meta") || "{}")); } catch { return { width: 0, height: 0, durationSec: 0, codec: "video/mp4", quality: "SD" }; }
  })();

  const id = crypto.randomUUID();
  const ext = (video.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
  const videoFile = `${id}.${ext}`;

  const videosDir = path.join(process.cwd(), "uploads", "videos");
  await mkdir(videosDir, { recursive: true });
  await writeFile(path.join(videosDir, videoFile), Buffer.from(await video.arrayBuffer()));

  let poster = String(fd.get("posterFallback") || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80");
  const posterFile = fd.get("poster");
  if (posterFile && posterFile instanceof File && posterFile.size > 0) {
    const buf = Buffer.from(await posterFile.arrayBuffer());
    const type = posterFile.type.startsWith("image/") ? posterFile.type : "image/jpeg";
    poster = `data:${type};base64,${buf.toString("base64")}`;
  }

  const cast = String(fd.get("cast") || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 12);
  const genre = String(fd.get("genre") || "Indie").slice(0, 40);
  const year = Math.min(2030, Math.max(1900, parseInt(String(fd.get("year") || "2026"), 10) || 2026));
  const uploadedBy = user?.name || String(fd.get("uploadedBy") || "Anonymous").trim().slice(0, 60) || "Anonymous";

  const durationSec = Math.round(meta.durationSec || 0);
  const runtime = durationSec > 0
    ? `${Math.floor(durationSec / 3600)}h ${Math.round((durationSec % 3600) / 60)}m`.replace(/^0h /, "")
    : "—";

  const detectedQuality = meta.quality || "SD";
  const streamUrl = `/api/stream/${videoFile}`;

  // Only the source rung exists at first: the movie is immediately playable.
  // The background worker adds transcoded + AI-upscaled rungs asynchronously.
  const initialVariants: VariantRow[] = [{ quality: detectedQuality, url: streamUrl, sizeBytes: video.size, kind: "source" }];
  const rating = (7 + Math.random() * 2.4).toFixed(1);

  try {
    await db.insert(publishedMovies).values({
      id, title,
      synopsis: String(fd.get("synopsis") || "").slice(0, 600),
      genre, cast, year, runtime, poster, uploadedBy,
      userId: user?.id ?? null,
      status: "processing",
      videoFile, ext,
      srcWidth: meta.width || 0,
      srcHeight: meta.height || 0,
      durationSec: String(durationSec),
      codec: meta.codec || video.type || "video/mp4",
      srcSizeBytes: String(video.size),
      detectedQuality,
      variants: initialVariants,
      rating,
    });
  } catch (e) {
    console.error("Publish insert failed:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Non-blocking: enqueue the transcode/upscale job and return immediately.
  const jobId = await enqueueJob(id, user?.id ?? null, detectedQuality);

  if (user) {
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: user.id,
      kind: "processing",
      title: "Upload received",
      body: `“${title}” (${detectedQuality}) is playable now. The pipeline is transcoding and upscaling higher rungs in the background — we'll ping you when it's done.`,
    });
  }

  return NextResponse.json({
    jobId,
    movie: {
      id, title, year, rating: parseFloat(rating), runtime,
      synopsis: String(fd.get("synopsis") || ""),
      cast, genre, poster,
      video: streamUrl,
      sizeMB: Math.round(video.size / MB),
      sourceKind: "community",
      uploadedBy,
      userId: user?.id ?? null,
      status: "processing",
      detected: { quality: detectedQuality, width: meta.width, height: meta.height, codec: meta.codec, durationSec },
      variants: initialVariants,
    },
  }, { status: 201 });
}
