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
  const range = request.headers.get("range");

  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
    if (start >= stat.size) {
      return new NextResponse("Range not satisfiable", { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
    }
    end = Math.min(end, stat.size - 1);
    const length = end - start + 1;
    const stream = createReadStream(filePath, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(length),
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(stat.size),
      "Content-Type": mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
