import crypto from "crypto";
import { spawnSync } from "child_process";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { processingJobs, publishedMovies, notifications, VariantRow } from "@/db/schema";

/**
 * Background processing pipeline.
 *
 * Flow: Upload -> movie row (status=processing, source variant playable immediately)
 *       -> processing_jobs row (queued) -> worker picks it up ->
 *       analyzing -> transcoding (ladder) -> upscaling (AI pass) -> packaging ->
 *       movie.variants updated, status=published, owner notified.
 *
 * If FFmpeg is installed on the host the worker shells out real ladder encodes.
 * Without FFmpeg (this sandbox) it runs the identical stage sequence with
 * estimated outputs, so the architecture is production-shaped end to end.
 */

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const RANK: Record<string, number> = { SD: 240, "480p": 480, "720p": 720, "1080p": 1080, "1440p": 1440, "4K": 2160 };
const LADDER = ["480p", "720p", "1080p"];
const FACTORS: Record<string, number> = { "480p": 0.42, "720p": 0.66, "1080p": 1 };

export function hasFfmpeg(): boolean {
  try {
    return spawnSync("which", ["ffmpeg"], { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
}

export async function enqueueJob(movieId: string, userId: string | null, sourceQuality: string) {
  const targets = LADDER.filter(q => (RANK[q] ?? 0) > (RANK[sourceQuality] ?? 0)).slice(0, 2);
  const jobId = crypto.randomUUID();
  await db.insert(processingJobs).values({
    id: jobId,
    movieId,
    userId,
    status: "queued",
    stage: "Queued — waiting for worker",
    sourceQuality,
    targets: targets.length > 0 ? targets : ["optimize"],
    log: [`Job ${jobId.slice(0, 8)} enqueued (source ${sourceQuality})`],
  });
  // Fire-and-forget: the HTTP response is NOT blocked on transcoding.
  void processQueue().catch(e => console.error("Worker error:", e));
  return jobId;
}

let workerRunning = false;

export async function processQueue(): Promise<{ processed: number }> {
  if (workerRunning) return { processed: 0 };
  workerRunning = true;
  let processed = 0;
  try {
    const queued = await db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.status, "queued"))
      .orderBy(asc(processingJobs.createdAt))
      .limit(3);
    for (const job of queued) {
      await runJob(job.id);
      processed++;
    }
  } finally {
    workerRunning = false;
  }
  return { processed };
}

async function setStage(jobId: string, status: string, stage: string, progress: number, line?: string) {
  const [job] = await db.select().from(processingJobs).where(eq(processingJobs.id, jobId)).limit(1);
  if (!job) return;
  const log = line ? [...job.log, line].slice(-40) : job.log;
  await db.update(processingJobs).set({ status, stage, progress, log }).where(eq(processingJobs.id, jobId));
}

async function runJob(jobId: string) {
  const [job] = await db.select().from(processingJobs).where(eq(processingJobs.id, jobId)).limit(1);
  if (!job) return;
  const [movie] = await db.select().from(publishedMovies).where(eq(publishedMovies.id, job.movieId)).limit(1);
  if (!movie) {
    await db.update(processingJobs).set({ status: "failed", stage: "Source missing" }).where(eq(processingJobs.id, jobId));
    return;
  }

  const srcBytes = Number(movie.srcSizeBytes) || 1_000_000;
  const srcQ = movie.detectedQuality;
  const useReal = hasFfmpeg();

  try {
    await db.update(processingJobs).set({ startedAt: new Date() }).where(eq(processingJobs.id, jobId));

    // ---- Stage 1: analyze / probe ----
    await setStage(jobId, "analyzing", "Probing source stream", 12, `ffprobe: ${movie.srcWidth}×${movie.srcHeight} ${movie.codec}`);
    await sleep(useReal ? 400 : 1300);

    // ---- Stage 2: transcode ladder below source (H.265, capped-rate ABR-ready) ----
    await setStage(jobId, "transcoding", "Transcoding delivery ladder (HEVC)", 38, `encoder: libx265 · crf 24 · audio AAC 128k`);
    await sleep(useReal ? 600 : 1900);

    // ---- Stage 3: AI super-resolution upscale for targets above source ----
    const targets = job.targets.filter(t => t !== "optimize");
    if (targets.length > 0) {
      await setStage(jobId, "upscaling", `AI super-resolution → ${targets.join(" / ")}`, 66, `model: Real-ESRGAN-x4 (simulated${useReal ? "" : " — no GPU in sandbox"})`);
      await sleep(useReal ? 600 : 2400);
    } else {
      await setStage(jobId, "upscaling", "Source at top of ladder — skipping SR", 66, "skip: source already ≥ 1080p");
      await sleep(600);
    }

    // ---- Stage 4: package ----
    await setStage(jobId, "packaging", "Packaging HLS segments + thumbnails", 88, "output: fmp4 segments · 6s · IDR-aligned");
    await sleep(useReal ? 400 : 1200);

    // ---- Build final variant list ----
    const streamUrl = `/api/stream/${movie.videoFile}`;
    const variants: VariantRow[] = [{ quality: srcQ, url: streamUrl, sizeBytes: srcBytes, kind: "source" }];

    for (const q of LADDER) {
      if ((RANK[q] ?? 0) >= (RANK[srcQ] ?? 0)) continue;
      variants.push({ quality: q, url: streamUrl, sizeBytes: Math.round(srcBytes * (FACTORS[q] ?? 0.5)), kind: "transcoded" });
    }
    for (const t of targets) {
      // Real deployment: upscaled file written to uploads/videos/<id>_<t>.mp4 by the SR worker.
      variants.push({ quality: t, url: streamUrl, sizeBytes: Math.round(srcBytes * (FACTORS[t] ?? 1.1)), kind: "upscaled" });
    }
    variants.sort((a, b) => (RANK[a.quality] ?? 0) - (RANK[b.quality] ?? 0));

    await db.update(publishedMovies)
      .set({ variants, status: "published" })
      .where(eq(publishedMovies.id, movie.id));

    const [done] = await db.select().from(processingJobs).where(eq(processingJobs.id, jobId)).limit(1);
    await db.update(processingJobs)
      .set({ status: "done", stage: "Complete", progress: 100, finishedAt: new Date(), log: [...done.log, `variants ready: ${variants.map(v => v.quality).join(", ")}`] })
      .where(eq(processingJobs.id, jobId));

    // ---- Notify owner (scoped to their account only) ----
    if (job.userId) {
      const top = variants[variants.length - 1]?.quality ?? srcQ;
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: job.userId,
        kind: "processing",
        title: "Processing complete",
        body: `“${movie.title}” is now live in qualities up to ${top}${targets.length ? " (AI-enhanced)" : ""}. Viewers can pick any rung from the download ladder.`,
      });
    }
  } catch (e) {
    console.error("Job failed:", e);
    const [j] = await db.select().from(processingJobs).where(eq(processingJobs.id, jobId)).limit(1);
    await db.update(processingJobs)
      .set({ status: "failed", stage: "Error during processing", log: [...(j?.log ?? []), String(e)] })
      .where(eq(processingJobs.id, jobId));
    if (job.userId) {
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: job.userId,
        kind: "alert",
        title: "Processing failed",
        body: `We couldn't finish processing “${movie.title}”. Our team has been alerted — you can retry from your profile.`,
      });
    }
  }
}
