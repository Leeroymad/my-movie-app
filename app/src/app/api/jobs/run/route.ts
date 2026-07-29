import { NextResponse } from "next/server";
import { processQueue, hasFfmpeg } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Idempotent worker trigger — safe to call repeatedly. */
export async function POST() {
  const result = await processQueue();
  return NextResponse.json({ ...result, ffmpeg: hasFfmpeg() });
}
