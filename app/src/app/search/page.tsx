"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bebas_Neue, Archivo } from "next/font/google";
import {
  Search as SearchIcon, X, Clock, TrendingUp, Star, ArrowUpRight,
  RotateCcw, Film, SlidersHorizontal,
} from "lucide-react";
import { useMovies } from "@/lib/useMovies";
import {
  searchMovies, splitHighlight, buildTrending, useSearchHistory,
} from "@/lib/search";

const display = Bebas_Neue({ weight: "400", subsets: ["latin"] });
const body = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

const SORTS = ["Relevance", "Top Rated", "Newest", "A–Z"] as const;
type Sort = (typeof SORTS)[number];

const MATCH_COLORS: Record<string, string> = {
  Title: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  Cast: "bg-rose-400/10 text-rose-300 border-rose-400/30",
  Genre: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  Synopsis: "bg-sky-400/10 text-sky-300 border-sky-400/30",
  Year: "bg-orange-400/10 text-orange-300 border-orange-400/30",
};

function Hi({ text, q }: { text: string; q: string }) {
  const parts = splitHighlight(text, q);
  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="bg-amber-400/25 text-amber-200 rounded-[3px] px-0.5">{p.text}</mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const { recent, add, remove, clear } = useSearchHistory();
  const inputRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [genre, setGenre] = useState("All");
  const [year, setYear] = useState("All");
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<Sort>("Relevance");

  const movies = useMovies();
  const genres = useMemo(() => ["All", ...new Set(movies.map(m => m.genre))], [movies]);
  const years = useMemo(() => ["All", ...[...new Set(movies.map(m => String(m.year)))].sort().reverse()], [movies]);
  const trending = useMemo(() => buildTrending(movies), [movies]);

  // Debounced live search
  useEffect(() => {
    const t = input.trim();
    if (!t) { setQuery(""); setPending(false); return; }
    setPending(true);
    const id = setTimeout(() => { setQuery(t); setPending(false); }, 220);
    return () => clearTimeout(id);
  }, [input]);

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    let r = searchMovies(query, movies);
    if (genre !== "All") r = r.filter(x => x.movie.genre === genre);
    if (year !== "All") r = r.filter(x => String(x.movie.year) === year);
    if (minRating > 0) r = r.filter(x => x.movie.rating >= minRating);
    switch (sort) {
      case "Top Rated": r = [...r].sort((a, b) => b.movie.rating - a.movie.rating); break;
      case "Newest": r = [...r].sort((a, b) => b.movie.year - a.movie.year); break;
      case "A–Z": r = [...r].sort((a, b) => a.movie.title.localeCompare(b.movie.title)); break;
    }
    return r;
  }, [query, movies, genre, year, minRating, sort]);

  const filtersActive = genre !== "All" || year !== "All" || minRating > 0;
  const hasQuery = query.length > 0;
  const popular = useMemo(() => [...movies].sort((a, b) => b.rating - a.rating).slice(0, 4), [movies]);

  const commitQuery = (q: string) => { const t = q.trim(); if (t) add(t); };

  return (
    <div className={body.className}>
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .animate-rise { animation: rise .5s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes shimmer { from { background-position: -460px 0; } to { background-position: 460px 0; } }
        .skeleton { background: linear-gradient(90deg, rgba(148,163,184,.07) 25%, rgba(148,163,184,.16) 37%, rgba(148,163,184,.07) 63%); background-size: 460px 100%; animation: shimmer 1.4s ease-in-out infinite; }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        .caret-blink { animation: blink 1.1s step-end infinite; }
      `}</style>

      {/* Layered ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-40 -left-40 h-[34rem] w-[34rem] rounded-full bg-amber-500/[0.07] blur-[120px]" />
        <div className="absolute -bottom-48 -right-40 h-[36rem] w-[36rem] rounded-full bg-rose-600/[0.06] blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")" }} />
      </div>

      <main className="relative z-10 pt-24 md:pt-28 pb-28 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Ghost backdrop type */}
        <div className={`${display.className} pointer-events-none absolute right-0 -top-6 md:top-0 text-[26vw] md:text-[13rem] leading-none text-white/[0.025] select-none hidden sm:block`} aria-hidden>
          INDEX
        </div>

        {/* Header — opens with the search field itself */}
        <header className="relative mb-10">
          <p className="text-[11px] font-bold tracking-[0.35em] text-amber-400/80 uppercase mb-3">Cinema Index · {movies.length} titles</p>
          <h1 className={`${display.className} text-6xl md:text-8xl leading-[0.9] text-white`}>
            FIND YOUR<br />NEXT <span className="text-amber-400">FIX</span><span className="caret-blink text-amber-400">_</span>
          </h1>

          <div className="mt-8 max-w-3xl group relative">
            <div className="absolute -inset-1 rounded-full bg-amber-400/0 blur-md group-focus-within:bg-amber-400/15 transition duration-500" />
            <div className="relative flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/80 backdrop-blur px-5 py-2 focus-within:border-amber-400/60 transition shadow-2xl shadow-black/40">
              <SearchIcon className="text-amber-400 shrink-0" size={22} />
              <input
                ref={inputRef}
                autoFocus
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") commitQuery(input); }}
                placeholder="Search titles, cast, genres, years…"
                className="w-full bg-transparent py-2.5 text-lg text-white placeholder-slate-500 focus:outline-none"
              />
              {input && (
                <button onClick={() => { setInput(""); inputRef.current?.focus(); }} className="text-slate-400 hover:text-white transition shrink-0" aria-label="Clear search">
                  <X size={20} />
                </button>
              )}
              <kbd className="hidden md:inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-400 shrink-0">/</kbd>
            </div>
            {hasQuery && !pending && (
              <p className="mt-3 pl-5 text-sm text-slate-400 animate-rise">
                <span className="font-bold text-white">{results.length}</span> {results.length === 1 ? "match" : "matches"} for
                <span className="text-amber-300"> “{query}”</span>
                {filtersActive && <span className="text-slate-500"> · filters applied</span>}
              </p>
            )}
          </div>
        </header>

        {/* ============ NO QUERY — discovery mode ============ */}
        {!hasQuery && (
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10">
            {/* Trending */}
            <section className="animate-rise">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-amber-400" />
                <h2 className="text-sm font-extrabold tracking-[0.2em] uppercase text-slate-300">Trending searches</h2>
              </div>
              <ol className="divide-y divide-white/5 border-y border-white/5">
                {trending.slice(0, 7).map((t, i) => (
                  <li key={`${t.kind}-${t.label}`}>
                    <button
                      onClick={() => {
                        if (t.kind === "movie" && t.id) { commitQuery(t.label); router.push(`/movie/${t.id}`); }
                        else { setInput(t.label); commitQuery(t.label); }
                      }}
                      className="group flex w-full items-center gap-4 py-3.5 text-left transition hover:bg-white/[0.03] hover:pl-2"
                    >
                      <span className={`${display.className} text-2xl text-slate-600 w-9 shrink-0 group-hover:text-amber-400 transition`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1">
                        <span className="block font-bold text-white group-hover:text-amber-300 transition">{t.label}</span>
                        <span className="block text-xs text-slate-500">{t.note}{t.kind === "movie" ? " · Movie" : ""}</span>
                      </span>
                      <ArrowUpRight size={16} className="text-slate-600 opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-amber-400" />
                    </button>
                  </li>
                ))}
              </ol>

              {/* Browse by genre / year chips */}
              <div className="mt-8">
                <h2 className="text-sm font-extrabold tracking-[0.2em] uppercase text-slate-300 mb-3">Browse by genre</h2>
                <div className="flex flex-wrap gap-2">
                  {genres.filter(g => g !== "All").map(g => (
                    <button key={g} onClick={() => { setInput(g); commitQuery(g); }}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-amber-400/50 hover:text-amber-300 hover:-translate-y-0.5">
                      {g}
                    </button>
                  ))}
                </div>
                <h2 className="text-sm font-extrabold tracking-[0.2em] uppercase text-slate-300 mt-6 mb-3">Browse by year</h2>
                <div className="flex flex-wrap gap-2">
                  {years.filter(y => y !== "All").map(y => (
                    <button key={y} onClick={() => { setInput(y); commitQuery(y); }}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm font-semibold text-slate-300 tabular-nums transition hover:border-amber-400/50 hover:text-amber-300 hover:-translate-y-0.5">
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Recent + all titles */}
            <section className="animate-rise" style={{ animationDelay: "90ms" }}>
              {recent.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={15} className="text-amber-400" />
                      <h2 className="text-sm font-extrabold tracking-[0.2em] uppercase text-slate-300">Recent searches</h2>
                    </div>
                    <button onClick={clear} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-400 transition">
                      <RotateCcw size={12} /> Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map(r => (
                      <span key={r} className="group flex items-center overflow-hidden rounded-full border border-white/10 bg-slate-900/70 text-sm">
                        <button onClick={() => setInput(r)} className="px-3.5 py-1.5 font-semibold text-slate-300 transition hover:text-amber-300">{r}</button>
                        <button onClick={() => remove(r)} className="pr-3 text-slate-600 transition hover:text-rose-400" aria-label={`Remove ${r}`}>
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <Film size={16} className="text-amber-400" />
                <h2 className="text-sm font-extrabold tracking-[0.2em] uppercase text-slate-300">All titles</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {movies.map((m, i) => (
                  <Link key={m.id} href={`/movie/${m.id}`} onClick={() => commitQuery(input)}
                    className="group relative overflow-hidden rounded-xl bg-slate-900 animate-rise"
                    style={{ animationDelay: `${120 + i * 45}ms` }}>
                    <img src={m.poster} alt={m.title} loading="lazy"
                      className="aspect-[2/3] w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.06] group-hover:opacity-100" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-2.5 pt-8">
                      <p className="truncate text-xs font-bold text-white">{m.title}</p>
                      <p className="text-[10px] text-slate-400">{m.genre} · ★ {m.rating.toFixed(1)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ============ QUERY — results mode ============ */}
        {hasQuery && (
          <>
            {/* Toolbar */}
            <div className="mb-6 flex flex-wrap items-center gap-3 animate-rise">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                <SlidersHorizontal size={14} className="text-amber-400" />
                <select value={genre} onChange={e => setGenre(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-200 focus:outline-none [&>option]:bg-slate-900">
                  {genres.map(g => <option key={g} value={g}>{g === "All" ? "All genres" : g}</option>)}
                </select>
              </div>
              <select value={year} onChange={e => setYear(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none [&>option]:bg-slate-900">
                {years.map(y => <option key={y} value={y}>{y === "All" ? "All years" : y}</option>)}
              </select>
              <div className="flex rounded-xl border border-white/10 bg-slate-900/70 p-1">
                {[0, 8, 9].map(r => (
                  <button key={r} onClick={() => setMinRating(r)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${minRating === r ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"}`}>
                    {r === 0 ? "Any" : `${r}+ ★`}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex rounded-xl border border-white/10 bg-slate-900/70 p-1">
                {SORTS.map(s => (
                  <button key={s} onClick={() => setSort(s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${sort === s ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"}`}>
                    {s}
                  </button>
                ))}
              </div>
              {filtersActive && (
                <button onClick={() => { setGenre("All"); setYear("All"); setMinRating(0); }}
                  className="flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300 transition">
                  <X size={13} /> Reset filters
                </button>
              )}
            </div>

            {/* Skeleton while debouncing */}
            {pending ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-white/5">
                    <div className="skeleton aspect-[2/3]" />
                    <div className="space-y-2 bg-slate-900/60 p-3">
                      <div className="skeleton h-3.5 w-3/4 rounded" />
                      <div className="skeleton h-3 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {results.map((r, i) => (
                  <Link key={r.movie.id} href={`/movie/${r.movie.id}`} onClick={() => commitQuery(query)}
                    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 transition duration-300 hover:-translate-y-1.5 hover:border-amber-400/30 hover:shadow-2xl hover:shadow-amber-400/10 animate-rise"
                    style={{ animationDelay: `${i * 45}ms` }}>
                    <div className="relative overflow-hidden">
                      <img src={r.movie.poster} alt={r.movie.title} loading="lazy"
                        className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-[1.07]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 opacity-80 transition group-hover:opacity-100" />
                      <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-xs font-extrabold text-amber-300 backdrop-blur">
                        <Star size={11} fill="currentColor" /> {r.movie.rating.toFixed(1)}
                      </span>
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap gap-1 opacity-0 translate-y-2 transition duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                        {r.matchedIn.map(f => (
                          <span key={f} className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold backdrop-blur ${MATCH_COLORS[f]}`}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="p-3.5">
                      <h3 className="truncate font-extrabold text-white group-hover:text-amber-300 transition">
                        <Hi text={r.movie.title} q={query} />
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        <Hi text={`${r.movie.genre} · ${r.movie.year}`} q={query} />
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                        <Hi text={r.movie.cast.join(", ")} q={query} />
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              /* No results */
              <div className="animate-rise border border-white/5 bg-slate-900/40 rounded-3xl px-6 py-16 text-center">
                <p className={`${display.className} text-6xl md:text-7xl text-white/90 leading-none`}>
                  NO <span className="text-rose-500">MATCHES</span>
                </p>
                <p className="mx-auto mt-4 max-w-md text-slate-400">
                  Nothing in the index for <span className="font-bold text-amber-300">“{query}”</span>.
                  {filtersActive ? " Try resetting the filters, or " : " Try "}
                  one of these instead:
                </p>
                {filtersActive && (
                  <button onClick={() => { setGenre("All"); setYear("All"); setMinRating(0); }}
                    className="mt-4 rounded-full border border-amber-400/40 bg-amber-400/10 px-5 py-2 text-sm font-bold text-amber-300 transition hover:bg-amber-400/20">
                    Reset all filters
                  </button>
                )}
                <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 sm:grid-cols-4 gap-3">
                  {popular.map(m => (
                    <Link key={m.id} href={`/movie/${m.id}`} className="group overflow-hidden rounded-xl border border-white/5 bg-slate-900/70 text-left transition hover:-translate-y-1 hover:border-amber-400/30">
                      <img src={m.poster} alt={m.title} className="aspect-[2/3] w-full object-cover opacity-85 transition group-hover:opacity-100" />
                      <p className="truncate px-2.5 py-2 text-xs font-bold text-white">{m.title}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
