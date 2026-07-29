"use client";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { Play, Pause, Trash2, ArrowRight } from "lucide-react";

export default function DownloadsPage() {
  const { state, updateDownload, removeDownload } = useApp();

  return (
    <main className="pt-20 md:pt-24 pb-24 px-4 md:px-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-8">Downloads Manager</h1>
      <section className="space-y-4">
        {state.downloads.length === 0 ? (
          <div className="text-slate-400 text-center py-20">No downloads yet. <Link href="/" className="text-amber-400 underline">Browse movies</Link></div>
        ) : (
          state.downloads.map(d => (
            <div key={d.movie.id} className="bg-slate-900 rounded-2xl p-5 border border-slate-800 flex flex-col md:flex-row gap-4 items-start md:items-center">
              <img src={d.movie.poster} alt={d.movie.title} className="w-20 h-28 object-cover rounded-lg" />
              <div className="flex-1">
                <h3 className="font-bold text-white">{d.movie.title}</h3>
                <p className="text-xs text-slate-400">{d.quality} · {d.sizeMB} MB</p>
                <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${d.progress}%` }} /></div>
                <p className="text-xs text-slate-300 mt-1">{d.progress}% · {d.status}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateDownload(d.movie.id, { status: d.status === "paused" ? "active" : "paused" })} className="bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700 text-sm font-bold" title="Pause/Resume">{d.status === "paused" ? <Play size={16} /> : <Pause size={16} />}</button>
                <button onClick={() => removeDownload(d.movie.id)} className="bg-red-900/30 text-red-400 px-3 py-2 rounded-lg hover:bg-red-900/50 text-sm font-bold" title="Cancel"><Trash2 size={16} /></button>
                {d.status === "completed" && <Link href={`/movie/${d.movie.id}`} className="bg-amber-400 text-slate-950 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-amber-300">Play <ArrowRight size={14} /></Link>}
              </div>
            </div>
          ))
        )}
      </section>
      <Link href="/" className="inline-block mt-10 bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition">Browse More Content</Link>
    </main>
  );
}
