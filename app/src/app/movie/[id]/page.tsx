"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { useMovies, invalidateMovies } from "@/lib/useMovies";
import { MB, Variant } from "@/lib/data";
import { saveToDevice, formatBytes } from "@/lib/downloads";
import {
  Play, Maximize, Subtitles, Download, ArrowLeft, Monitor, Wand2,
  CheckCircle2, HardDriveDownload, User as UserIcon, Cpu, Loader2,
} from "lucide-react";

export default function MoviePage() {
  const { id } = useParams() as { id: string };
  const all = useMovies();
  const movie = all.find(m => m.id === id);
  const { addToWatchlist, state, addDownload, updateDownload, addWatchHistory } = useApp();

  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<{ t: number; play: boolean } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [subs, setSubs] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [quality, setQuality] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [job, setJob] = useState<{ status: string; stage: string; progress: number; log: string[]; targets: string[] } | null>(null);

  // Poll the background pipeline while this title is still processing.
  useEffect(() => {
    if (movie?.status !== "processing") return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/jobs/${movie.id}`);
        const d = await r.json();
        if (!alive || !d.job) return;
        setJob(d.job);
        if (d.job.status === "done" || d.job.status === "failed") invalidateMovies();
      } catch {}
    };
    tick();
    const t = setInterval(tick, 1600);
    return () => { alive = false; clearInterval(t); };
  }, [movie?.id, movie?.status]);

  const variants: Variant[] = useMemo(() => {
    if (!movie) return [];
    if (movie.variants && movie.variants.length > 0) return movie.variants;
    return [{ quality: "1080p", url: movie.video, sizeBytes: movie.sizeMB * MB, kind: "source" }];
  }, [movie]);

  const topVariant = variants[variants.length - 1];
  const activeQuality = quality ?? topVariant?.quality ?? "1080p";
  const activeVariant = variants.find(v => v.quality === activeQuality) ?? topVariant;

  // Track watch history as the video plays
  useEffect(() => {
    if (!movie || progress <= 0) return;
    const t = setTimeout(() => addWatchHistory(movie, Math.round(progress)), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress > 5, progress > 25, progress > 50, progress > 75, progress > 92]);

  if (!movie) {
    return (
      <main className="pt-24 pb-28 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="aspect-video w-full rounded-3xl bg-slate-900 animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-10 w-2/3 rounded-xl bg-slate-900 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-slate-900 animate-pulse" />
            <div className="h-32 rounded-2xl bg-slate-900 animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  const switchQuality = (q: string) => {
    const v = videoRef.current;
    if (v) pendingSeek.current = { t: v.currentTime || 0, play: !v.paused };
    setQuality(q);
    setShowQuality(false);
  };

  const downloadUrl = (url: string) =>
    url.startsWith("/api/stream/") ? url.replace("/api/stream/", "/api/download/") : url;

  const handleVariantDownload = async (v: Variant) => {
    setSaving(v.quality);
    const ext = (movie.video.match(/\.([a-z0-9]+)$/i)?.[1] || "mp4").toLowerCase();
    const filename = `${movie.title}_${v.quality}.${ext}`;
    addDownload(movie, v.quality);
    updateDownload(movie.id, { quality: v.quality, sizeMB: Math.round(v.sizeBytes / MB) });
    await saveToDevice(downloadUrl(v.url), filename);
    updateDownload(movie.id, { progress: 100, status: "completed", quality: v.quality, sizeMB: Math.round(v.sizeBytes / MB) });
    setSaving(null);
  };

  const completed = state.downloads.find(d => d.movie.id === movie.id && d.status === "completed");
  const isCommunity = movie.sourceKind === "community";

  return (
    <main className="pt-20 md:pt-24 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-amber-400 font-semibold mb-6 hover:underline"><ArrowLeft size={18} /> Back to Home</Link>

      <section className="grid md:grid-cols-3 gap-8">
        {/* ---- Player ---- */}
        <div className="md:col-span-2">
          <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl shadow-black/60">
            <video
              key={activeVariant?.url + activeQuality}
              ref={videoRef}
              src={activeVariant?.url || movie.video}
              className="w-full aspect-video object-cover"
              playsInline
              onTimeUpdate={e => setProgress((e.currentTarget.currentTime / (e.currentTarget.duration || 1)) * 100)}
              onLoadedMetadata={() => {
                if (pendingSeek.current && videoRef.current) {
                  videoRef.current.currentTime = pendingSeek.current.t;
                  if (pendingSeek.current.play) videoRef.current.play().catch(() => {});
                  pendingSeek.current = null;
                }
              }}
              poster={movie.poster}
            />
            <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 hover:opacity-100 transition">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-lg flex items-center gap-2">
                  {movie.title}
                  <span className="rounded-md bg-amber-400/20 border border-amber-400/40 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-300">{activeQuality}</span>
                </span>
                <button onClick={() => videoRef.current?.requestFullscreen()} className="text-white hover:text-amber-400"><Maximize size={20} /></button>
              </div>
              <div className="flex flex-col gap-3">
                <input type="range" min={0} max={100} value={progress} onChange={e => { const v = Number(e.target.value); setProgress(v); if (videoRef.current) videoRef.current.currentTime = (v / 100) * (videoRef.current.duration || 0); }} className="w-full accent-amber-400" />
                <div className="flex items-center justify-between">
                  <button onClick={() => { setPlaying(p => !p); playing ? videoRef.current?.pause() : videoRef.current?.play(); }} className="bg-amber-400 text-black p-2 rounded-full hover:scale-105 transition"><Play size={18} /></button>
                  <div className="flex gap-3 items-center">
                    <button onClick={() => setSubs(s => !s)} className={`p-2 rounded-full ${subs ? "bg-amber-400 text-black" : "bg-white/10 text-white"}`}><Subtitles size={18} /></button>
                    <div className="relative">
                      <button onClick={() => setShowQuality(!showQuality)} className="bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-white/20">{activeQuality} ▾</button>
                      {showQuality && (
                        <div className="absolute bottom-full left-0 mb-2 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl text-xs min-w-[130px]">
                          {[...variants].reverse().map(v => (
                            <button key={v.quality} onClick={() => switchQuality(v.quality)}
                              className={`block w-full px-4 py-2 text-left hover:bg-slate-800 ${v.quality === activeQuality ? "text-amber-300 font-bold" : ""}`}>
                              {v.quality}{v.kind === "source" ? " · SRC" : ""}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {subs && <p className="absolute bottom-24 inset-x-0 text-center text-white text-sm font-semibold bg-black/50 mx-auto w-fit px-3 py-1 rounded-lg pointer-events-none">♪ [subtitles on] — {movie.title}</p>}
          </div>

          <div className="mt-6 flex gap-4 flex-wrap">
            <Link href="/downloads" className="text-sm text-slate-300 hover:text-amber-400">View Downloads</Link>
            <Link href="/watchlist" className="text-sm text-slate-300 hover:text-amber-400">My Watchlist</Link>
            <Link href="/publish" className="text-sm text-slate-300 hover:text-amber-400">Publish your own</Link>
          </div>
        </div>

        {/* ---- Info ---- */}
        <aside className="space-y-5">
          <div>
            <div className="flex items-start gap-2 flex-wrap">
              <h2 className="text-3xl font-extrabold text-white">{movie.title}</h2>
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400/15 border border-amber-400/30 px-2 py-1 text-[10px] font-extrabold text-amber-300 tracking-wider">
                <Wand2 size={11} /> AUTO · {movie.detected?.quality || topVariant?.quality}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1.5">
              {movie.year} · {movie.runtime} · {movie.genre} · <span className="text-amber-300 font-bold">★ {movie.rating.toFixed(1)}</span>
            </p>
            {isCommunity && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-400">
                <UserIcon size={12} /> Published by <span className="font-bold text-slate-200">{movie.uploadedBy}</span> · Community upload
              </p>
            )}
            <p className="text-slate-200 mt-3 leading-relaxed">{movie.synopsis}</p>
          </div>

          {/* Auto quality report */}
          <div className="bg-slate-900 rounded-2xl p-5 border border-white/5">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm tracking-wider uppercase"><Wand2 size={14} className="text-amber-400" /> Quality report</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-slate-950 p-3"><p className="text-[10px] text-slate-500 uppercase font-bold">Grade</p><p className="font-extrabold text-amber-300">{movie.detected?.quality || "—"}</p></div>
              <div className="rounded-xl bg-slate-950 p-3"><p className="text-[10px] text-slate-500 uppercase font-bold">Frame</p><p className="font-bold text-white tabular-nums">{movie.detected?.width ? `${movie.detected.width}×${movie.detected.height}` : "—"}</p></div>
              <div className="rounded-xl bg-slate-950 p-3"><p className="text-[10px] text-slate-500 uppercase font-bold">Codec</p><p className="font-bold text-white truncate">{movie.detected?.codec || "H.264"}</p></div>
              <div className="rounded-xl bg-slate-950 p-3"><p className="text-[10px] text-slate-500 uppercase font-bold">Source size</p><p className="font-bold text-white">{formatBytes(movie.sizeMB * MB)}</p></div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5 border border-white/5">
            <h3 className="font-bold text-white mb-2 text-sm tracking-wider uppercase">Cast</h3>
            <div className="flex flex-wrap gap-2">
              {movie.cast.map(c => <span key={c} className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300 border border-slate-700">{c}</span>)}
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button onClick={() => addToWatchlist(movie)} className="bg-amber-400 text-slate-950 px-5 py-3 rounded-xl font-bold hover:bg-amber-300 shadow-lg shadow-amber-400/10 transition">+ Watchlist</button>
            <button className="bg-slate-900 text-white border border-slate-700 px-5 py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center gap-2"><Monitor size={16} /> Cast</button>
          </div>
        </aside>
      </section>

      {/* ---- Background pipeline status ---- */}
      {movie.status === "processing" && job && (
        <section className="mt-12 rounded-3xl border border-amber-400/20 bg-amber-400/[0.04] p-6 animate-rise">
          <div className="flex items-center gap-2 flex-wrap">
            <Cpu size={18} className="text-amber-400" />
            <h2 className="text-xl font-extrabold text-white">Background pipeline running</h2>
            <span className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-amber-300">NON-BLOCKING</span>
          </div>
          <p className="mt-1.5 text-sm text-slate-400">
            The {movie.detected?.quality} source is <span className="font-bold text-emerald-300">playable now</span> — transcode & AI-upscale to
            {job.targets?.length ? ` ${job.targets.join(" / ")}` : " optimized delivery"} is running in the background.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-900">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500" style={{ width: `${job.progress}%` }} />
            </div>
            <span className="text-sm font-extrabold text-amber-300 tabular-nums">{job.progress}%</span>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm font-bold text-white"><Loader2 size={14} className="animate-spin text-amber-400" /> {job.stage}</p>
          {job.log?.length > 0 && (
            <div className="mt-3 rounded-xl border border-white/5 bg-slate-950/80 p-3 font-mono text-[11px] leading-relaxed text-slate-400 max-h-28 overflow-y-auto">
              {job.log.slice(-5).map((l, i) => <p key={i}><span className="text-amber-400/70">▸</span> {l}</p>)}
            </div>
          )}
        </section>
      )}
      {movie.status === "processing" && !job && (
        <section className="mt-12 rounded-3xl border border-white/10 bg-slate-900/50 p-6 animate-pulse">
          <p className="text-sm font-bold text-slate-400">Connecting to processing pipeline…</p>
        </section>
      )}

      {/* ---- Download quality section ---- */}
      <section className="mt-12">
        <div className="flex items-end justify-between flex-wrap gap-2 mb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2"><HardDriveDownload className="text-amber-400" size={22} /> Download to your device</h2>
            <p className="text-sm text-slate-400 mt-1">Pick a quality — the file saves straight to your phone or PC downloads.</p>
          </div>
          {completed && <p className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400"><CheckCircle2 size={16} /> {completed.quality} saved to device</p>}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {variants.map(v => (
            <div key={v.quality} className={`group rounded-2xl border p-5 transition hover:-translate-y-1 ${v.kind === "source" ? "border-amber-400/40 bg-amber-400/[0.05]" : "border-white/10 bg-slate-900/60 hover:border-amber-400/30"}`}>
              <div className="flex items-center justify-between">
                <span className="text-xl font-extrabold text-white">{v.quality}</span>
                {v.kind === "source"
                  ? <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950">SOURCE</span>
                  : v.kind === "upscaled"
                    ? <span className="rounded-md border border-sky-400/40 bg-sky-400/10 px-2 py-0.5 text-[10px] font-extrabold text-sky-300">AI-UPSCALED</span>
                    : <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">AUTO-FIT</span>}
              </div>
              <p className="mt-1 text-sm text-slate-400 tabular-nums">{formatBytes(v.sizeBytes)}</p>
              <button onClick={() => handleVariantDownload(v)} disabled={saving === v.quality}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-white transition group-hover:bg-amber-400 group-hover:text-slate-950 disabled:opacity-60">
                <Download size={15} /> {saving === v.quality ? "Saving…" : state.downloads.some(d => d.movie.id === movie.id && d.quality === v.quality && d.status === "completed") ? "Download again" : "Download"}
              </button>
            </div>
          ))}
          {/* Locked rungs still being produced by the pipeline */}
          {movie.status === "processing" && (job?.targets || []).map(t => (
            <div key={t} className="rounded-2xl border border-dashed border-white/15 bg-slate-900/30 p-5 opacity-70">
              <div className="flex items-center justify-between">
                <span className="text-xl font-extrabold text-slate-500">{t}</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                  <Loader2 size={10} className="animate-spin" /> RENDERING
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">unlocks when the pipeline finishes</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-2/3 animate-pulse rounded-full bg-slate-700" /></div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Related ---- */}
      <section className="mt-12">
        <h2 className="text-2xl font-extrabold text-white mb-4">More {movie.genre}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {all.filter(m => m.genre === movie.genre && m.id !== movie.id).slice(0, 6).map(m => (
            <Link key={m.id} href={`/movie/${m.id}`} className="group relative rounded-xl overflow-hidden bg-slate-900">
              <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover transition duration-300 group-hover:scale-105" />
              <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                <p className="truncate text-xs font-bold text-white">{m.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
