"use client";

import { useEffect, useState } from "react";
import { movies as builtinMovies, Movie } from "./data";

let cache: Movie[] | null = null;
const listeners = new Set<(list: Movie[]) => void>();

export function invalidateMovies() {
  cache = null;
  fetch("/api/movies")
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      if (data && Array.isArray(data.movies) && data.movies.length > 0) {
        cache = data.movies;
        listeners.forEach(fn => fn(cache!));
      }
    })
    .catch(() => {});
}

/** Merged catalog: community-published movies (from DB) + built-in titles. */
export function useMovies(): Movie[] {
  const [list, setList] = useState<Movie[]>(cache ?? builtinMovies);

  useEffect(() => {
    const listener = (l: Movie[]) => setList(l);
    listeners.add(listener);
    if (!cache) invalidateMovies();
    else setList(cache);
    return () => { listeners.delete(listener); };
  }, []);

  return list;
}
