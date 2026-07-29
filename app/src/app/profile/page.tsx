"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bebas_Neue, Archivo } from "next/font/google";
import {
  Inbox, LogOut, Film, BellRing, Clapperboard, ArrowRight, CheckCheck,
  Mail, MailOpen, Sparkles, AlertTriangle, User as UserIcon, HardDrive,
  Play, Trash2, X, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useApp } from "@/lib/store";
import { useMovies, invalidateMovies } from "@/lib/useMovies";
import { formatBytes } from "@/lib/downloads";
import { Movie } from "@/lib/data";

const display = Bebas_Neue({ weight: "400", subsets: ["latin"] });
const body = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

interface InboxItem { id: string; title: string; body: string; kind: string; status: string; createdAt: string; }

const KIND_STYLE: Record<string, { icon: typeof Mail; cls: string }> = {
  welcome: { icon: Sparkles, cls: "text-amber-300 bg-amber-400/10 border-amber-400/25" },
  processing: { icon: Clapperboard, cls: "text-sky-300 bg-sky-400/10 border-sky-400/25" },
  alert: { icon: AlertTriangle, cls: "text-rose-300 bg-rose-400/10 border-rose-400/25" },
  system: { icon: BellRing, cls: "text-slate-300 bg-white/5 border-white/10" },
};

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { state } = useApp();
  const movies = useMovies();
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = () => fetch("/api/notifications").then(r => r.ok ? r.json() : null).then(d => { if (d) setInbox(d.notifications); }).catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [user]);

  const myUploads = useMemo(() => movies.filter(m => m.userId && m.userId === user?.id), [movies, user]);
  const storageBytes = useMemo(() => myUploads.reduce((s, m) => s + (m.sizeMB || 0) * 1048576, 0), [myUploads]);
  const unread = inbox.filter(n => n.status === "unread").length;

  // Keep the processing badge honest while jobs run
  useEffect(() => {
    if (!myUploads.some(m => m.status === "processing")) return;
    const t = setInterval(() => invalidateMovies(), 2500);
    return () => clearInterval(t);
  }, [myUploads]);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setInbox(i => i.map(x => (x.id === id ? { ...x, status: "read" } : x)));
  };
  const markAll = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    setInbox(i => i.map(x => ({ ...x, status: "read" })));
  };

  const removeUpload = async (m: Movie) => {
    setDeleting(true);
    try {
      await fetch(`/api/uploads/${m.id}`, { method: "DELETE" });
      invalidateMovies();
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <main className="pt-28 pb-28 px-4 max-w-5xl mx-auto"><div className="h-40 rounded-3xl bg-slate-900 animate-pulse" /></main>;
  }

  /* ---------------- GUEST VIEW ---------------- */
  if (!user) {
    return (
      <div className={body.className}>
        <main className="pt-24 md:pt-28 pb-28 px-4 md:px-8 max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div>
              <p className="text-[11px] font-bold tracking-[0.35em] text-amber-400/80 uppercase mb-3 flex items-center gap-2"><UserIcon size={14} /> Guest mode</p>
              <h1 className={`${display.className} text-6xl md:text-7xl leading-[0.9] text-white`}>
                WATCHING AS A<br /><span className="text-amber-400">GUEST</span>
              </h1>
              <p className="mt-5 max-w-lg text-slate-400">
                You can browse, stream and download everything on Cinema Stream right now — no account needed.
                Sign in to unlock your private inbox, upload tracking and a profile that follows you across devices.
              </p>
              <div className="mt-7 flex gap-3 flex-wrap">
                <Link href="/auth" className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-extrabold text-slate-950 transition hover:bg-amber-300 hover:-translate-y-0.5">Sign in / Create account <ArrowRight size={16} /></Link>
                <Link href="/" className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-bold text-white transition hover:bg-white/10">Keep browsing</Link>
              </div>
              <ul className="mt-8 space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Members-only: system messages & processing alerts</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Members-only: publish films under your own name</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Guests keep: downloads, watchlist & device settings (stored on this device)</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <h2 className="text-sm font-extrabold uppercase tracking-[0.2em] text-slate-400 mb-4">What members see here</h2>
              <div className="space-y-3">
                {[
                  { icon: Clapperboard, t: "My uploads studio", d: "Every film you publish with live pipeline status" },
                  { icon: Inbox, t: "Private inbox", d: "Welcome note, transcode alerts, moderation mail" },
                  { icon: Film, t: "Account details", d: "Name, email, role badge, member-since date" },
                ].map(r => (
                  <div key={r.t} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3.5 opacity-80">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-amber-400/20 bg-amber-400/[0.06] text-amber-300"><r.icon size={17} /></span>
                    <div><p className="font-bold text-white text-sm">{r.t}</p><p className="text-xs text-slate-500">{r.d}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ---------------- MEMBER VIEW ---------------- */
  return (
    <div className={body.className}>
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .animate-rise { animation: rise .5s cubic-bezier(.2,.7,.2,1) both; }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-40 right-0 h-[28rem] w-[28rem] rounded-full bg-amber-500/[0.05] blur-[120px]" />
      </div>

      <main className="relative z-10 pt-24 md:pt-28 pb-28 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Account header */}
        <header className="animate-rise flex flex-wrap items-center gap-5 rounded-3xl border border-white/10 bg-slate-950/70 p-6 md:p-7">
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-3xl font-extrabold text-slate-950 shadow-lg shadow-amber-400/20">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-[12rem]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">{user.name}</h1>
              {user.role === "admin"
                ? <span className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-emerald-300">ADMIN</span>
                : <span className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-amber-300">PREMIUM 4K</span>}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">{user.email}</p>
            <p className="text-xs text-slate-600 mt-0.5">Member since {new Date(user.createdAt || Date.now()).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</p>
          </div>
          <div className="flex gap-3">
            {user.role === "admin" && <Link href="/admin" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/20">Admin panel</Link>}
            <button onClick={async () => { await signOut(); router.push("/"); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:text-rose-300 hover:border-rose-400/30">
              <LogOut size={15} /> Log out
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="animate-rise grid grid-cols-2 md:grid-cols-4 gap-3 mt-5" style={{ animationDelay: "60ms" }}>
          {[
            { n: String(myUploads.length), l: "Films published" },
            { n: formatBytes(storageBytes), l: "Storage used" },
            { n: String(unread), l: "Unread messages" },
            { n: String(state.watchlist.length), l: "In watchlist" },
          ].map(s => (
            <div key={s.l} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-center">
              <p className="text-2xl md:text-3xl font-extrabold text-amber-300 tabular-nums">{s.n}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>

        {/* ---- My uploads: full-width studio shelf ---- */}
        <section className="animate-rise mt-8" style={{ animationDelay: "100ms" }}>
          <div className="flex items-end justify-between flex-wrap gap-2 mb-4">
            <div>
              <h2 className={`${display.className} text-4xl md:text-5xl leading-none text-white`}>MY <span className="text-amber-400">UPLOADS</span></h2>
              <p className="text-sm text-slate-500 mt-1">Every film you've published, with pipeline status and quality ladders.</p>
            </div>
            <Link href="/publish" className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-amber-300 hover:-translate-y-0.5">
              <Clapperboard size={16} /> Publish new film
            </Link>
          </div>

          {myUploads.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-white/10 bg-slate-950/40 px-6 py-14 text-center">
              <Film className="mx-auto text-slate-600" size={36} />
              <p className="mt-3 font-bold text-white text-lg">Your shelf is empty</p>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">Drop a video in the studio — we'll auto-grade the quality, upscale the higher rungs and put it right here.</p>
              <Link href="/publish" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-extrabold text-slate-950 transition hover:bg-amber-300 hover:-translate-y-0.5">Upload your first film <ArrowRight size={16} /></Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {myUploads.map((m, i) => (
                <div key={m.id} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 transition duration-300 hover:-translate-y-1.5 hover:border-amber-400/30 hover:shadow-2xl hover:shadow-amber-400/10 animate-rise" style={{ animationDelay: `${120 + i * 50}ms` }}>
                  <Link href={`/movie/${m.id}`} className="block relative">
                    <img src={m.poster} alt={m.title} className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-[1.06]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/30" />
                    {/* status badge */}
                    <span className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-extrabold tracking-wider backdrop-blur ${
                      m.status === "processing" ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
                        : m.status === "flagged" ? "border-rose-400/50 bg-rose-400/15 text-rose-300"
                          : "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"}`}>
                      {m.status === "processing" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />}
                      {(m.status || "published").toUpperCase()}
                    </span>
                    {/* play affordance */}
                    <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-amber-400 text-slate-950 shadow-xl shadow-amber-400/30 transition group-hover:scale-110"><Play size={20} fill="currentColor" /></span>
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="truncate font-extrabold text-white">{m.title}</p>
                      <p className="text-[11px] text-slate-400">{m.genre} · {m.year} · {formatBytes((m.sizeMB || 0) * 1048576)}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(m.variants || []).map(v => (
                          <span key={v.quality} className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${v.kind === "source" ? "border-amber-400/50 text-amber-300" : v.kind === "upscaled" ? "border-sky-400/50 text-sky-300" : "border-white/20 text-slate-300"}`}>{v.quality}</span>
                        ))}
                      </div>
                    </div>
                  </Link>
                  {/* owner controls */}
                  <div className="flex items-center justify-between border-t border-white/5 bg-slate-950/80 px-2.5 py-2">
                    <Link href={`/movie/${m.id}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 transition hover:text-amber-300"><ExternalLink size={11} /> Open page</Link>
                    {confirmDelete === m.id ? (
                      <span className="flex items-center gap-1">
                        <button onClick={() => removeUpload(m)} disabled={deleting} className="rounded-md bg-rose-500 px-2 py-1 text-[10px] font-extrabold text-white transition hover:bg-rose-400 disabled:opacity-60">{deleting ? "…" : "Sure?"}</button>
                        <button onClick={() => setConfirmDelete(null)} className="grid h-6 w-6 place-items-center rounded-md border border-white/10 text-slate-400 hover:text-white"><X size={11} /></button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelete(m.id)} title="Delete upload" className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 transition hover:text-rose-400"><Trash2 size={11} /> Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Inbox + settings */}
        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <section className="animate-rise rounded-3xl border border-white/10 bg-slate-950/70 p-6" style={{ animationDelay: "140ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-white"><Inbox size={18} className="text-amber-400" /> Inbox {unread > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold text-white">{unread} new</span>}</h2>
              {unread > 0 && <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:underline"><CheckCheck size={13} /> Mark all read</button>}
            </div>
            {inbox.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No messages yet — publish a film and watch this space fill up.</p>
            ) : (
              <ul className="space-y-2.5 max-h-[24rem] overflow-y-auto pr-1">
                {inbox.map(n => {
                  const k = KIND_STYLE[n.kind] || KIND_STYLE.system;
                  const Icon = n.status === "unread" ? Mail : MailOpen;
                  return (
                    <li key={n.id}>
                      <button onClick={() => n.status === "unread" && markRead(n.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${n.status === "unread" ? "border-amber-400/25 bg-amber-400/[0.05]" : "border-white/5 bg-white/[0.02] opacity-80"}`}>
                        <div className="flex items-start gap-3">
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${k.cls}`}><k.icon size={15} /></span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-sm truncate">{n.title}</p>
                              {n.status === "unread" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{n.body}</p>
                            <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600"><Icon size={10} /> {timeAgo(n.createdAt)} · {n.status}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="animate-rise rounded-3xl border border-white/10 bg-slate-950/70 p-6" style={{ animationDelay: "180ms" }}>
            <DeviceSettings />
          </section>
        </div>
      </main>
    </div>
  );
}

/* Shared device-level preferences (works for guests and members). */
function DeviceSettings() {
  const { state, setWifiOnly, setVideoQuality, setDownloadQuality, toggleDarkMode } = useApp();
  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-white"><HardDrive size={18} className="text-amber-400" /> Device preferences</h2>
      <div>
        <h3 className="font-bold text-white mb-3 text-sm tracking-wider uppercase">Streaming quality</h3>
        <div className="flex flex-wrap gap-2">
          {(["Auto", "Low", "Medium", "High"] as const).map(q => (
            <button key={q} onClick={() => setVideoQuality(q)} className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${state.settings.videoQuality === q ? "bg-amber-400 text-slate-950 border-amber-400" : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"}`}>{q}</button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-white mb-3 text-sm tracking-wider uppercase">Downloads</h3>
        <label className="flex items-center gap-3 cursor-pointer mb-3">
          <input type="checkbox" checked={state.settings.wifiOnly} onChange={e => setWifiOnly(e.target.checked)} className="w-5 h-5 accent-amber-400 rounded" />
          <span className="text-sm text-slate-300">Wi-Fi only</span>
        </label>
        <div className="flex gap-2">
          {(["720p", "1080p"] as const).map(q => (
            <button key={q} onClick={() => setDownloadQuality(q)} className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${state.settings.downloadQuality === q ? "bg-amber-400 text-slate-950 border-amber-400" : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"}`}>{q}</button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-white mb-3 text-sm tracking-wider uppercase">Appearance</h3>
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
          <span className="text-sm text-slate-300">Dark mode</span>
          <button onClick={toggleDarkMode} className={`w-12 h-7 rounded-full transition relative ${state.settings.darkMode ? "bg-amber-400" : "bg-slate-700"}`} aria-label="Toggle dark mode">
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${state.settings.darkMode ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
