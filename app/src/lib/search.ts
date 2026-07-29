import { useEffect, useState } from "react";
import { Movie, movies } from "./data";

export interface SearchResult {
  movie: Movie;
  score: number;
  matchedIn: string[];
}

export const tokenize = (q: string) =>
  q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Weighted multi-field search. Every term should match somewhere for a bonus. */
export function searchMovies(query: string, list: Movie[] = movies): SearchResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const out: SearchResult[] = [];
  for (const movie of list) {
    const hay = {
      title: movie.title.toLowerCase(),
      cast: movie.cast.join(" ").toLowerCase(),
      genre: movie.genre.toLowerCase(),
      synopsis: movie.synopsis.toLowerCase(),
      year: String(movie.year),
    };
    let score = 0;
    const matchedIn = new Set<string>();
    let allMatch = true;

    for (const t of terms) {
      let termScore = 0;
      if (hay.title.startsWith(t)) { termScore += 60; matchedIn.add("Title"); }
      else if (hay.title.includes(t)) { termScore += 40; matchedIn.add("Title"); }
      if (hay.cast.includes(t)) { termScore += 20; matchedIn.add("Cast"); }
      if (hay.genre.includes(t)) { termScore += 15; matchedIn.add("Genre"); }
      if (hay.synopsis.includes(t)) { termScore += 8; matchedIn.add("Synopsis"); }
      if (hay.year === t) { termScore += 25; matchedIn.add("Year"); }
      else if (hay.year.startsWith(t) && t.length >= 2) { termScore += 12; matchedIn.add("Year"); }
      if (termScore === 0) allMatch = false;
      score += termScore;
    }

    if (score > 0) {
      out.push({ movie, score: allMatch ? score + 25 : score, matchedIn: [...matchedIn] });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Split text into parts, marking segments that match any query term. */
export function splitHighlight(text: string, query: string): { text: string; hit: boolean }[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [{ text, hit: false }];
  const splitter = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "gi");
  const tester = new RegExp(`^(?:${terms.map(escapeRegex).join("|")})$`, "i");
  return text
    .split(splitter)
    .filter(part => part.length > 0)
    .map(part => ({ text: part, hit: tester.test(part) }));
}

export interface TrendingItem {
  label: string;
  note: string;
  kind: "movie" | "tag";
  id?: string;
}

export function buildTrending(list: Movie[] = movies): TrendingItem[] {
  const top = [...list].sort((a, b) => b.rating - a.rating).slice(0, 3)
    .map(m => ({ label: m.title, note: `★ ${m.rating.toFixed(1)}`, kind: "movie" as const, id: m.id }));
  const genres = [...new Set(list.map(m => m.genre))].slice(0, 4)
    .map(g => ({ label: g, note: "Genre", kind: "tag" as const }));
  const years = [...new Set(list.map(m => String(m.year)))].sort().reverse().slice(0, 2)
    .map(y => ({ label: y, note: "Year", kind: "tag" as const }));
  return [...top, ...genres, ...years];
}

const HISTORY_KEY = "cinema-search-history";

export function useSearchHistory() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"));
    } catch { setRecent([]); }
  }, []);

  const persist = (list: string[]) => {
    setRecent(list);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch {}
  };

  const add = (q: string) => {
    const t = q.trim();
    if (!t) return;
    setRecent(prev => {
      const next = [t, ...prev.filter(r => r.toLowerCase() !== t.toLowerCase())].slice(0, 8);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const remove = (q: string) => persist(recent.filter(r => r !== q));
  const clear = () => persist([]);

  return { recent, add, remove, clear };
}
