"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { useMovies } from "@/lib/useMovies";
import { Play, Plus, Search, Clapperboard, Wand2, Star } from "lucide-react";

export default function HomePage() {
  const { addToWatchlist } = useApp();
  const movies = useMovies();
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const genres = useMemo(() => ["All", ...new Set(movies.map(m => m.genre))], [movies]);

  const filtered = movies.filter(m => {
    const matchGenre = genre === "All" || m.genre === genre;
    const matchQuery = m.title.toLowerCase().includes(query.toLowerCase()) || m.genre.toLowerCase().includes(query.toLowerCase()) || (m.cast || []).join(" ").toLowerCase().includes(query.toLowerCase());
    return matchGenre && matchQuery;
  });

  const featured = useMemo(() => [...movies].sort((a, b) => b.rating - a.rating)[0], [movies]);
  const community = useMemo(() => movies.filter(m => m.sourceKind === "community"), [movies]);

  return (
    <main className="pt-20 md:pt-24 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Hero */}
      {featured && (
        <section className="relative rounded-3xl overflow-hidden mb-12 shadow-2xl shadow-black/50">
          <img src={featured.poster} alt={featured.title} className="w-full h-[32rem] object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <p className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.3em] uppercase text-amber-400 mb-3">
              <Wand2 size={13} /> Auto-graded {featured.detected?.quality || "HD"} {featured.sourceKind === "community" && <span className="rounded bg-white/10 px-2 py-0.5 text-slate-300">Community</span>}
            </p>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-3">{featured.title}</h1>
            <p className="text-slate-200 max-w-xl mb-6">{featured.synopsis}</p>
            <div className="flex gap-3 flex-wrap">
              <Link href={`/movie/${featured.id}`} className="inline-flex items-center gap-2 bg-amber-400 text-slate-950 px-6 py-3 rounded-xl font-bold hover:bg-amber-300 transition shadow-lg shadow-amber-400/20"><Play size={18} fill="currentColor" /> Play Now</Link>
              <button onClick={() => addToWatchlist(featured)} className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/10 px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition backdrop-blur"><Plus size={18} /> Watchlist</button>
            </div>
          </div>
        </section>
      )}

      {/* Search & Filter */}
      <section className="flex flex-col md:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search movies, cast, genres…" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {genres.map(g => <button key={g} onClick={() => setGenre(g)} className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${genre === g ? "bg-amber-400 text-slate-950" : "bg-slate-900 text-slate-300 border border-slate-800 hover:text-white"}`}>{g}</button>)}
        </div>
      </section>

      {/* Community row */}
      {community.length > 0 && genre === "All" && !query && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2"><Clapperboard className="text-amber-400" size={22} /> Fresh from the community</h2>
            <Link href="/publish" className="text-sm font-bold text-amber-400 hover:underline">Publish yours →</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3">
            {community.map(m => (
              <Link key={m.id} href={`/movie/${m.id}`} className="group relative w-44 shrink-0 rounded-2xl overflow-hidden bg-slate-900 hover:-translate-y-1 transition">
                <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition duration-300" />
                <div className="absolute top-2 left-2 rounded-md bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950">{m.detected?.quality}</div>
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 to-transparent">
                  <h3 className="font-bold text-white truncate text-sm">{m.title}</h3>
                  <p className="text-[11px] text-slate-300">by {m.uploadedBy} · ★ {m.rating.toFixed(1)}</p>
                </div>
              </Link>
            ))}
            <Link href="/publish" className="group flex w-44 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 bg-slate-900/40 text-slate-400 transition hover:border-amber-400/50 hover:text-amber-300 aspect-[2/3]">
              <Clapperboard size={28} className="transition group-hover:scale-110" />
              <span className="text-sm font-bold">Upload your film</span>
              <span className="text-[11px] text-slate-600">Auto-graded on publish</span>
            </Link>
          </div>
        </section>
      )}

      {/* Carousels */}
      <section className="space-y-10">
        {[
          { title: "Trending Now", list: filtered },
          { title: "Popular Movies", list: [...filtered].sort((a, b) => b.rating - a.rating) },
        ].map(group => (
          <div key={group.title}>
            <h2 className="text-2xl font-extrabold mb-4 text-white">{group.title}</h2>
            {group.list.length === 0 ? (
              <p className="text-slate-500 text-sm">No titles match your search.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {group.list.map(m => (
                  <Link key={m.id} href={`/movie/${m.id}`} className="group relative rounded-2xl overflow-hidden shadow-lg shadow-black/30 bg-slate-900 hover:-translate-y-1 transition">
                    <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition duration-300" />
                    {m.sourceKind === "community" && <span className="absolute top-2 left-2 rounded-md bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950">NEW</span>}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                      <h3 className="font-bold text-white truncate">{m.title}</h3>
                      <p className="text-xs text-slate-300 flex items-center gap-1">{m.genre} · {m.year} · <Star size={10} fill="currentColor" className="text-amber-300" /> {m.rating.toFixed(1)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
