"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bebas_Neue, Archivo } from "next/font/google";
import {
  UploadCloud, Film, Wand2, ArrowRight, CheckCircle2,
  ImagePlus, X, Clapperboard, Cpu,
} from "lucide-react";
import { analyzeVideoFile, formatBytes, formatDuration } from "@/lib/downloads";
import { invalidateMovies } from "@/lib/useMovies";
import { Movie } from "@/lib/data";

const display = Bebas_Neue({ weight: "400", subsets: ["latin"] });
const body = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

const GENRES = ["Action", "Sci-Fi", "Drama", "Mystery", "Fantasy", "Comedy", "Horror", "Documentary", "Indie"];
const inputCls = "w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 transition";
const labelCls = "block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400 mb-1.5";

interface Analysis {
  width: number; height: number; durationSec: number; codec: string;
  quality: string; posterBlob: Blob | null;
}

export default function PublishPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterFile, setPosterFile] = useState<File | Blob | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Indie");
  const [year, setYear] = useState("2026");
  const [cast, setCast] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Movie | null>(null);

  const handleFile = async (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("video/")) {
      setError("Please choose a video file (MP4, WebM, MOV…).");
      return;
    }
    setError("");
    setVideoFile(file);
    setAnalyzing(true);
    setAnalysis(null);
    setPosterUrl(null);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[._-]+/g, " "));
    const a = await analyzeVideoFile(file);
    setAnalysis(a);
    if (a.posterBlob) {
      setPosterFile(a.posterBlob);
      setPosterUrl(URL.createObjectURL(a.posterBlob));
    }
    setAnalyzing(false);
  };

  const handlePoster = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPosterFile(file);
    setPosterUrl(URL.createObjectURL(file));
  };

  const publish = () => {
    if (!videoFile || !analysis) { setError("Add a video file first."); return; }
    if (!title.trim()) { setError("Give your movie a title."); return; }
    setError("");
    setUploading(true);
    setProgress(0);

    const fd = new FormData();
    fd.append("video", videoFile);
    fd.append("title", title.trim());
    fd.append("genre", genre);
    fd.append("year", year);
    fd.append("cast", cast);
    fd.append("synopsis", synopsis);
    fd.append("uploadedBy", uploadedBy.trim() || "Anonymous");
    fd.append("meta", JSON.stringify({
      width: analysis.width, height: analysis.height,
      durationSec: analysis.durationSec, codec: analysis.codec, quality: analysis.quality,
    }));
    if (posterFile) fd.append("poster", posterFile instanceof File ? posterFile : new File([posterFile], "poster.jpg", { type: "image/jpeg" }));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/movies/publish");
    xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 201) {
        try {
          const data = JSON.parse(xhr.responseText);
          invalidateMovies();
          setDone(data.movie);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch { setError("Unexpected server response."); }
      } else {
        try { setError(JSON.parse(xhr.responseText).error || "Upload failed."); } catch { setError("Upload failed."); }
      }
    };
    xhr.onerror = () => { setUploading(false); setError("Network error during upload."); };
    xhr.send(fd);
  };

  /* ---------- success state ---------- */
  if (done) {
    return (
      <div className={body.className}>
        <main className="relative pt-24 md:pt-28 pb-28 px-4 md:px-8 max-w-3xl mx-auto">
          <div className="animate-rise rounded-3xl border border-emerald-400/20 bg-slate-900/60 p-8 md:p-10 text-center">
            <CheckCircle2 className="mx-auto text-emerald-400" size={52} />
            <h1 className={`${display.className} mt-4 text-5xl md:text-6xl text-white`}>NOW <span className="text-amber-400">SHOWING</span></h1>
            <p className="mt-3 text-slate-300">
              <span className="font-bold text-white">“{done.title}”</span> is live on Cinema Stream. The {done.detected?.quality} source is
              <span className="font-bold text-emerald-300"> playable right now</span> — the background pipeline is already transcoding and AI-upscaling the higher rungs without blocking anything.
            </p>
            <p className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.07] px-4 py-1.5 text-xs font-extrabold text-amber-300">
              <Cpu size={13} /> BACKGROUND JOB RUNNING · TRACK IT ON THE MOVIE PAGE
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-left">
              <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.25em] text-amber-400 uppercase">
                <Wand2 size={13} /> Auto quality report
              </div>
              <p className="mt-2 text-sm text-slate-300">
                <span className="rounded-md bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 font-extrabold text-amber-300">{done.detected?.quality}</span>
                <span className="ml-2">{done.detected?.width}×{done.detected?.height}</span>
                <span className="ml-2 text-slate-500">·</span>
                <span className="ml-2">{done.detected?.codec}</span>
                <span className="ml-2 text-slate-500">·</span>
                <span className="ml-2">{formatBytes(done.sizeMB * 1048576)}</span>
              </p>
              <div className="mt-4 space-y-2">
                {(done.variants || []).map(v => (
                  <div key={v.quality} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2.5">
                    <span className="font-extrabold text-white">{v.quality}</span>
                    <span className="text-xs text-slate-400">{formatBytes(v.sizeBytes)} {v.kind === "source" && <span className="ml-1 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">SOURCE</span>}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={() => router.push(`/movie/${done.id}`)} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-extrabold text-slate-950 transition hover:bg-amber-300 hover:-translate-y-0.5">
                <Film size={17} /> Watch movie page <ArrowRight size={16} />
              </button>
              <button onClick={() => router.push("/")} className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-bold text-white transition hover:bg-white/10">Back to Home</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ---------- form state ---------- */
  return (
    <div className={body.className}>
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .animate-rise { animation: rise .5s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes pulseDot { 0%,100% { opacity: .35; } 50% { opacity: 1; } }
        .pulse-dot { animation: pulseDot 1.2s ease-in-out infinite; }
        @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(320%); } }
        .scanline { animation: scan 1.6s linear infinite; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-32 right-0 h-[30rem] w-[30rem] rounded-full bg-amber-500/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 -left-40 h-[30rem] w-[30rem] rounded-full bg-emerald-500/[0.05] blur-[120px]" />
      </div>

      <main className="relative z-10 pt-24 md:pt-28 pb-28 px-4 md:px-8 max-w-6xl mx-auto">
        <header className="mb-10">
          <p className="text-[11px] font-bold tracking-[0.35em] text-amber-400/80 uppercase mb-3 flex items-center gap-2">
            <Clapperboard size={14} /> Open Studio · Anyone can publish
          </p>
          <h1 className={`${display.className} text-6xl md:text-8xl leading-[0.9] text-white`}>
            DROP A FILM.<br />WE <span className="text-amber-400">ANALYZE</span> THE REST.
          </h1>
          <p className="mt-4 max-w-xl text-slate-400">
            Upload your video — the system automatically detects resolution, codec and runtime,
            stamps a quality grade on it, and builds the download ladder viewers choose from.
          </p>
        </header>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
          {/* ---- Left: form ---- */}
          <section className="space-y-6 animate-rise">
            {/* Dropzone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
              onClick={() => fileRef.current?.click()}
              className={`relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed p-8 text-center transition duration-300 ${dragOver ? "border-amber-400 bg-amber-400/[0.06] scale-[1.01]" : "border-white/15 bg-slate-900/50 hover:border-amber-400/50 hover:bg-slate-900/80"}`}
            >
              {analyzing && <div className="scanline pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-amber-400/15 to-transparent" />}
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
              <UploadCloud className={`mx-auto transition ${dragOver ? "text-amber-400 scale-110" : "text-slate-500"}`} size={40} />
              {videoFile ? (
                <>
                  <p className="mt-3 font-extrabold text-white break-all">{videoFile.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{formatBytes(videoFile.size)} · {videoFile.type || "video"}</p>
                  <p className="mt-2 text-xs font-bold text-amber-400">Click or drop again to replace</p>
                </>
              ) : (
                <>
                  <p className="mt-3 font-extrabold text-white text-lg">Drag your video here</p>
                  <p className="mt-1 text-sm text-slate-400">MP4 · WebM · MOV — or click to browse</p>
                </>
              )}
              {analyzing && <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-amber-300"><span className="pulse-dot">●</span> Analyzing video stream…</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Static City" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Genre</label>
                <select value={genre} onChange={e => setGenre(e.target.value)} className={inputCls}>
                  {GENRES.map(g => <option key={g} value={g} className="bg-slate-900">{g}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Year</label>
                <input value={year} onChange={e => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} className={inputCls} inputMode="numeric" />
              </div>
              <div>
                <label className={labelCls}>Cast (comma separated)</label>
                <input value={cast} onChange={e => setCast(e.target.value)} placeholder="Ada Stone, Bo Kim" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Your name</label>
                <input value={uploadedBy} onChange={e => setUploadedBy(e.target.value)} placeholder="Director / studio" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Synopsis</label>
                <textarea value={synopsis} onChange={e => setSynopsis(e.target.value)} rows={3} placeholder="One or two lines about the film…" className={`${inputCls} resize-none`} />
              </div>
            </div>

            {/* Poster */}
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              {posterUrl ? (
                <div className="relative shrink-0">
                  <img src={posterUrl} alt="Poster preview" className="h-24 w-16 rounded-lg object-cover border border-white/10" />
                  <button onClick={() => { setPosterUrl(null); setPosterFile(null); }} className="absolute -right-2 -top-2 rounded-full bg-slate-800 border border-white/10 p-1 text-slate-300 hover:text-rose-400 transition" aria-label="Remove poster">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="grid h-24 w-16 shrink-0 place-items-center rounded-lg border border-dashed border-white/15 bg-slate-950/60 text-slate-600"><Film size={20} /></div>
              )}
              <div className="flex-1">
                <p className="font-bold text-white text-sm">Poster</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {analysis?.posterBlob && !posterFile ? "Auto-extracted from your film." : posterFile ? "Custom poster attached." : "A frame is auto-extracted from your video, or upload your own."}
                </p>
                <button onClick={() => posterRef.current?.click()} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:text-amber-300 hover:border-amber-400/40">
                  <ImagePlus size={13} /> Upload poster
                </button>
                <input ref={posterRef} type="file" accept="image/*" className="hidden" onChange={e => handlePoster(e.target.files?.[0])} />
              </div>
            </div>

            {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300">{error}</p>}

            {uploading ? (
              <div className="rounded-2xl border border-amber-400/20 bg-slate-900/60 p-5">
                <div className="flex justify-between text-sm font-bold text-white mb-2">
                  <span>Uploading to Cinema Stream…</span><span className="text-amber-300 tabular-nums">{progress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <button onClick={publish} disabled={!videoFile || analyzing}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-4 text-lg font-extrabold text-slate-950 shadow-xl shadow-amber-400/15 transition hover:bg-amber-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0">
                <Clapperboard size={20} /> Publish movie <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </button>
            )}
          </section>

          {/* ---- Right: live auto-annotation panel ---- */}
          <aside className="lg:sticky lg:top-24 animate-rise" style={{ animationDelay: "100ms" }}>
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.25em] uppercase text-amber-400">
                <Wand2 size={14} /> Auto quality annotation
              </div>

              {!videoFile && (
                <div className="mt-6 space-y-3">
                  {["Resolution & quality grade", "Codec + container", "Runtime", "Poster frame extraction"].map((s, i) => (
                    <div key={s} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                      <span className="h-2 w-2 rounded-full bg-slate-700" />
                      <span className="text-sm text-slate-500">{s}</span>
                      <span className="ml-auto text-[10px] font-bold text-slate-700">WAITING</span>
                    </div>
                  ))}
                  <p className="pt-2 text-xs text-slate-600">Drop a video and the analysis appears here instantly.</p>
                </div>
              )}

              {videoFile && analyzing && (
                <div className="mt-6 space-y-3">
                  {["Reading stream header…", "Measuring resolution…", "Detecting codec…", "Extracting poster frame…"].map((s, i) => (
                    <div key={s} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                      <span className="pulse-dot h-2 w-2 rounded-full bg-amber-400" style={{ animationDelay: `${i * 0.15}s` }} />
                      <span className="text-sm text-slate-400">{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {videoFile && analysis && !analyzing && (
                <div className="mt-6 space-y-3 animate-rise">
                  <div className="flex items-center justify-between rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-4">
                    <div>
                      <p className="text-[10px] font-extrabold tracking-[0.2em] text-slate-400 uppercase">Quality grade</p>
                      <p className="font-extrabold text-2xl text-amber-300">{analysis.quality}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-extrabold tracking-[0.2em] text-slate-400 uppercase">Frame</p>
                      <p className="font-bold text-white tabular-nums">{analysis.width}×{analysis.height}</p>
                    </div>
                  </div>
                  {[
                    { k: "Codec", v: analysis.codec || "video/mp4" },
                    { k: "Runtime", v: formatDuration(analysis.durationSec) || "—" },
                    { k: "File size", v: formatBytes(videoFile.size) },
                    { k: "Poster frame", v: analysis.posterBlob ? "Extracted ✓" : "Upload recommended" },
                  ].map(r => (
                    <div key={r.k} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{r.k}</span>
                      <span className="text-sm font-bold text-white">{r.v}</span>
                    </div>
                  ))}

                  <div>
                    <p className="mt-2 text-[10px] font-extrabold tracking-[0.2em] text-slate-400 uppercase mb-2">Download ladder viewers will see</p>
                    <div className="flex flex-wrap gap-2">
                      {(["480p", "720p", "1080p", "1440p", "4K"].filter(q => {
                        const rank: Record<string, number> = { "480p": 480, "720p": 720, "1080p": 1080, "1440p": 1440, "4K": 2160 };
                        return rank[q] <= (rank[analysis.quality] ?? 1080);
                      })).map((q, i, arr) => (
                        <span key={q} className={`rounded-lg border px-3 py-1.5 text-xs font-extrabold ${i === arr.length - 1 ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-white/10 bg-white/[0.03] text-slate-300"}`}>
                          {q}{i === arr.length - 1 ? " · SRC" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Link href="/" className="mt-4 block text-center text-sm font-semibold text-slate-500 transition hover:text-amber-400">← Back to browsing</Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
