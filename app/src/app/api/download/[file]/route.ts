import { NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm",
  mov: "video/quicktime", mkv: "video/x-matroska", ogv: "video/ogg",
};

export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const safe = path.basename(file).replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe) return new NextResponse("Bad file name", { status: 400 });

  const filePath = path.join(process.cwd(), "uploads", "videos", safe);
  if (!existsSync(filePath)) return new NextResponse("File not found", { status: 404 });

  const stat = statSync(filePath);
  const ext = safe.split(".").pop() || "mp4";
  const mime = MIME[ext] || "application/octet-stream";

  const url = new URL(request.url);
  let name = (url.searchParams.get("name") || safe).replace(/[\\/:*?"<>|#%&{}$!'@+`=~^]/g, "_").slice(0, 120);
  if (!name.toLowerCase().endsWith(`.${ext}`)) name = `${name}.${ext}`;

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Length": String(stat.size),
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
