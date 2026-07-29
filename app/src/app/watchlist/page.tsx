"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { Trash2, ArrowRight } from "lucide-react";

export default function WatchlistPage() {
  const { state, removeFromWatchlist, addWatchHistory } = useApp();
  const [tab, setTab] = useState("watchlist");
  const history = state.watchHistory.sort((a,b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime());

  const items = tab === "watchlist" ? state.watchlist : history.map(h => h.movie);

  return (
    <main className="pt-20 md:pt-24 pb-24 px-4 md:px-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-6">My Library</h1>
      <div className="flex gap-3 mb-6">
        <button onClick={() => setTab("watchlist")} className={`px-4 py-2 rounded-full font-bold text-sm ${tab === "watchlist" ? "bg-amber-400 text-slate-950" : "bg-slate-900 text-slate-300 border border-slate-800"}`}>Watchlist</button>
        <button onClick={() => setTab("history")} className={`px-4 py-2 rounded-full font-bold text-sm ${tab === "history" ? "bg-amber-400 text-slate-950" : "bg-slate-900 text-slate-300 border border-slate-800"}`}>Watch History</button>
      </div>
      {items.length === 0 ? (
        <div className="text-slate-400 text-center py-16">Empty list. <Link href="/" className="text-amber-400 underline">Browse movies</Link></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {items.map(movie => (
            <Link key={movie.id} href={`/movie/${movie.id}`} className="group relative">
              <img src={movie.poster} alt={movie.title} className="w-full aspect-[2/3] rounded-2xl object-cover shadow-lg shadow-black/30 group-hover:scale-[1.02] transition" />
              <div className="absolute top-2 right-2">
                <button onClick={e => { e.preventDefault(); e.stopPropagation(); removeFromWatchlist(movie.id); }} className="bg-black/60 text-white p-1.5 rounded-full hover:bg-red-600 transition" title="Remove"><Trash2 size={14} /></button>
              </div>
              <h3 className="mt-2 font-bold text-white truncate">{movie.title}</h3>
              <p className="text-xs text-slate-400">{movie.genre} · {movie.year}</p>
            </Link>
          ))}
        </div>
      )}
      <Link href="/" className="inline-flex items-center gap-2 mt-10 bg-amber-400 text-slate-950 px-6 py-3 rounded-xl font-bold hover:bg-amber-300 transition">Explore More <ArrowRight size={16} /></Link>
    </main>
  );
}
