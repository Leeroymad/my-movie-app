"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Movie } from "./data";

export interface DownloadItem {
  movie: Movie;
  quality: string;
  progress: number; // 0-100
  status: "active" | "paused" | "completed" | "cancelled";
  sizeMB: number;
}

interface AppState {
  watchlist: Movie[];
  watchHistory: { movie: Movie; progress: number; lastWatched: string }[];
  downloads: DownloadItem[];
  settings: {
    darkMode: boolean;
    wifiOnly: boolean;
    videoQuality: "Auto" | "Low" | "Medium" | "High";
    downloadQuality: "720p" | "1080p";
  };
}

const DEFAULT_SETTINGS = { darkMode: true, wifiOnly: true, videoQuality: "Auto" as const, downloadQuality: "1080p" as const };

function defaultState(): AppState {
  return { watchlist: [], watchHistory: [], downloads: [], settings: { ...DEFAULT_SETTINGS } };
}

function initState(): AppState {
  if (typeof window === "undefined") return defaultState();
  const saved = localStorage.getItem("cinema-state");
  if (!saved) return defaultState();
  try {
    const parsed = JSON.parse(saved);
    return {
      watchlist: (parsed.watchlist || []).filter((m: any) => m && m.id && m.title),
      watchHistory: (parsed.watchHistory || []).filter((h: any) => h?.movie?.id && h.movie.title),
      downloads: (parsed.downloads || []).filter((d: any) => d?.movie?.id && d.movie.title),
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch {
    return defaultState();
  }
}

type Ctx = {
  state: AppState;
  addToWatchlist: (m: Movie) => void;
  removeFromWatchlist: (id: string) => void;
  addWatchHistory: (m: Movie, progress: number) => void;
  addDownload: (m: Movie, quality: string) => void;
  updateDownload: (movieId: string, updates: Partial<DownloadItem>) => void;
  removeDownload: (movieId: string) => void;
  toggleDarkMode: () => void;
  setWifiOnly: (v: boolean) => void;
  setVideoQuality: (v: "Auto" | "Low" | "Medium" | "High") => void;
  setDownloadQuality: (v: "720p" | "1080p") => void;
};

const StateContext = createContext<Ctx>({
  state: defaultState(),
  addToWatchlist: () => {}, removeFromWatchlist: () => {}, addWatchHistory: () => {},
  addDownload: () => {}, updateDownload: () => {}, removeDownload: () => {},
  toggleDarkMode: () => {}, setWifiOnly: () => {}, setVideoQuality: () => {}, setDownloadQuality: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initState);

  useEffect(() => {
    // Full movie objects are persisted so community-published titles survive reloads.
    try { localStorage.setItem("cinema-state", JSON.stringify(state)); } catch {}
  }, [state]);

  const addToWatchlist = (m: Movie) => setState(prev => ({ ...prev, watchlist: prev.watchlist.find(w => w.id === m.id) ? prev.watchlist : [...prev.watchlist, m] }));
  const removeFromWatchlist = (id: string) => setState(prev => ({ ...prev, watchlist: prev.watchlist.filter(w => w.id !== id) }));
  const addWatchHistory = (m: Movie, progress: number) => setState(prev => {
    const list = prev.watchHistory.filter(h => h.movie.id !== m.id);
    list.push({ movie: m, progress, lastWatched: new Date().toISOString() });
    return { ...prev, watchHistory: list };
  });
  const addDownload = (m: Movie, quality: string) => setState(prev => ({
    ...prev,
    downloads: [...prev.downloads.filter(d => !(d.movie.id === m.id && d.quality === quality)), { movie: m, quality, progress: 0, status: "active", sizeMB: m.sizeMB }],
  }));
  const updateDownload = (movieId: string, updates: Partial<DownloadItem>) => setState(prev => ({ ...prev, downloads: prev.downloads.map(d => d.movie.id === movieId ? { ...d, ...updates } : d) }));
  const removeDownload = (movieId: string) => setState(prev => ({ ...prev, downloads: prev.downloads.filter(d => d.movie.id !== movieId) }));
  const toggleDarkMode = () => setState(prev => ({ ...prev, settings: { ...prev.settings, darkMode: !prev.settings.darkMode } }));
  const setWifiOnly = (v: boolean) => setState(prev => ({ ...prev, settings: { ...prev.settings, wifiOnly: v } }));
  const setVideoQuality = (v: "Auto" | "Low" | "Medium" | "High") => setState(prev => ({ ...prev, settings: { ...prev.settings, videoQuality: v } }));
  const setDownloadQuality = (v: "720p" | "1080p") => setState(prev => ({ ...prev, settings: { ...prev.settings, downloadQuality: v } }));

  return (
    <StateContext.Provider value={{ state, addToWatchlist, removeFromWatchlist, addWatchHistory, addDownload, updateDownload, removeDownload, toggleDarkMode, setWifiOnly, setVideoQuality, setDownloadQuality }}>
      {children}
    </StateContext.Provider>
  );
}

export const useApp = () => useContext(StateContext);
