"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bebas_Neue, Archivo } from "next/font/google";
import {
  ShieldCheck, ShieldX, Eye, Pencil, Trash2, Search, X, Play,
  HardDrive, Users, Film, Loader2, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { formatBytes } from "@/lib/downloads";

const display = Bebas_Neue({ weight: "400", subsets: ["latin"] });
const body = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

interface Upload {
  id: string; title: string; genre: string; year: number; synopsis: string;
  poster: string; videoFile: string; uploadedBy: string; userId: string | null;
  ownerEmail: string | null; ownerName: string | null;
  status: string; srcSizeBytes: string; detectedQuality: string;
  variants: { quality: string; kind: string }[];
  createdAt: string;
  job: { status: string; stage: string; progress: number } | null;
}
interface Member { id: string; email: string; name: string; role: string; createdAt: string; }

const STATUS_BADGE: Record<string, string> = {
  processing: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  published: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  flagged: "border-rose-400/40 bg-rose-400/10 text-rose-300",
  unpublished: "border-slate-500/40 bg-slate-500/10 text-slate-400",
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [blocked, setBlocked] = useState<null | number>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [preview, setPreview] = useState<Upload | null>(null);
  const [editing, setEditing] = useState<Upload | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const r = await fetch("/api/admin/uploads");
    if (!r.ok) { setBlocked(r.status); return; }
    const d = await r.json();
    setUploads(d.uploads);
    setMembers(d.users);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/auth?next=/admin"); return; }
    fetchAll();
  }, [user, loading, router, fetchAll]);

  // Live-refresh while anything is processing
  const anyProcessing = uploads.some(u => u.status === "processing");
  useEffect(() => {
    if (!anyProcessing || blocked) return;
    const t = setInterval(fetchAll, 3000);
    return () => clearInterval(t);
  }, [anyProcessing, blocked, fetchAll]);

  const filtered = useMemo(() => uploads.filter(u => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || u.title.toLowerCase().includes(q) || (u.ownerEmail || "").toLowerCase().includes(q) || (u.ownerName || "").toLowerCase().includes(q) || u.uploadedBy.toLowerCase().includes(q);
    const matchS = statusFilter === "all" || u.status === statusFilter;
    return matchQ && matchS;
  }), [uploads, query, statusFilter]);

  const stats = useMemo(() => ({
    total: uploads.length,
    processing: uploads.filter(u => u.status === "processing").length,
    published: uploads.filter(u => u.status === "published").length,
    hidden: uploads.filter(u => u.status === "flagged" || u.status === "unpublished").length,
    bytes: uploads.reduce((s, u) => s + Number(u.srcSizeBytes || 0), 0),
  }), [uploads]);

  const setStatus = async (u: Upload, status: string) => {
    await fetch(`/api/admin/uploads/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchAll();
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/uploads/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    fetchAll();
  };

  if (loading) return <main className="pt-28 pb-28 px-4 max-w-6xl mx-auto"><div className="h-52 rounded-3xl bg-slate-900 animate-pulse" /></main>;

  /* Non-admins hit a hard wall — the APIs also 403, so this is UI, not the boundary. */
  if (!user || blocked || user.role !== "admin") {
    return (
      <div className={body.className}>
        <main className="pt-28 pb-28 px-4 max-w-xl mx-auto text-center">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-rose-400/30 bg-rose-400/10 text-rose-400"><ShieldX size={38} /></span>
          <h1 className={`${display.className} mt-6 text-6xl text-white`}>403 · <span className="text-rose-500">RESTRICTED</span></h1>
          <p className="mt-3 text-slate-400">
            This area is reserved for studio administrators. Your account{user ? ` (${user.email})` : ""} does not carry the admin role, and every admin API independently re-checks it server-side.
          </p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-amber-400 px-6 py-3 font-extrabold text-slate-950 transition hover:bg-amber-300">Back to Home</Link>
        </main>
      </div>
    );
  }

  return (
    <div className={body.className}>
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .animate-rise { animation: rise .5s cubic-bezier(.2,.7,.2,1) both; }
      `}</style>
      <main className="pt-24 md:pt-28 pb-28 px-4 md:px-8 max-w-7xl mx-auto">
        <header className="animate-rise flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-bold tracking-[0.35em] text-emerald-400 uppercase mb-2 flex items-center gap-2"><ShieldCheck size={14} /> Admin only · RBAC enforced server-side</p>
            <h1 className={`${display.className} text-6xl md:text-7xl leading-[0.9] text-white`}>STUDIO <span className="text-amber-400">CONTROL</span></h1>
          </div>
          <button onClick={fetchAll} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:text-white hover:bg-white/10">
            <RefreshCw size={15} className={anyProcessing ? "animate-spin" : ""} /> Refresh
          </button>
        </header>

        {/* Stats */}
        <div className="animate-rise grid grid-cols-2 md:grid-cols-5 gap-3 mb-8" style={{ animationDelay: "60ms" }}>
          {[
            { icon: Film, n: String(stats.total), l: "Total uploads" },
            { icon: Loader2, n: String(stats.processing), l: "Processing", spin: stats.processing > 0 },
            { icon: ShieldCheck, n: String(stats.published), l: "Published" },
            { icon: Eye, n: String(stats.hidden), l: "Hidden / flagged" },
            { icon: HardDrive, n: formatBytes(stats.bytes), l: "Storage used" },
          ].map(s => (
            <div key={s.l} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <s.icon size={16} className={`text-amber-400 ${s.spin ? "animate-spin" : ""}`} />
              <p className="mt-2 text-2xl font-extrabold text-white tabular-nums">{s.n}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_16rem] gap-6 items-start">
          {/* Uploads table */}
          <section className="animate-rise rounded-3xl border border-white/10 bg-slate-950/70 p-5" style={{ animationDelay: "100ms" }}>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[12rem]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title, uploader, email…"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none [&>option]:bg-slate-900">
                <option value="all">All statuses</option>
                <option value="processing">Processing</option>
                <option value="published">Published</option>
                <option value="flagged">Flagged</option>
                <option value="unpublished">Unpublished</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <p className="py-14 text-center text-sm text-slate-500">No uploads match. {uploads.length === 0 && "Nothing has been published yet."}</p>
            ) : (
              <ul className="space-y-2.5">
                {filtered.map(u => (
                  <li key={u.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5 transition hover:border-white/15">
                    <div className="flex items-center gap-3.5">
                      <img src={u.poster} alt={u.title} className="h-16 w-11 shrink-0 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-white truncate">{u.title}</p>
                          <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider ${STATUS_BADGE[u.status] || STATUS_BADGE.unpublished}`}>
                            {u.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {u.ownerName || u.uploadedBy}{u.ownerEmail ? ` · ${u.ownerEmail}` : " · guest"} · {new Date(u.createdAt).toLocaleDateString()}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-500 tabular-nums">{formatBytes(Number(u.srcSizeBytes))} · src {u.detectedQuality}</span>
                          {u.variants.map(v => (
                            <span key={v.quality} className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${v.kind === "source" ? "border-amber-400/40 text-amber-300" : v.kind === "upscaled" ? "border-sky-400/40 text-sky-300" : "border-white/15 text-slate-400"}`}>{v.quality}</span>
                          ))}
                        </div>
                        {u.status === "processing" && u.job && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${u.job.progress}%` }} /></div>
                            <span className="text-[10px] font-bold text-amber-300 whitespace-nowrap">{u.job.stage} · {u.job.progress}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button onClick={() => setPreview(u)} title="Preview" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:text-amber-300 hover:border-amber-400/40"><Eye size={15} /></button>
                        <button onClick={() => setEditing(u)} title="Edit" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:text-amber-300 hover:border-amber-400/40"><Pencil size={15} /></button>
                        {u.status === "published"
                          ? <button onClick={() => setStatus(u, "unpublished")} title="Unpublish" className="rounded-lg border border-white/10 bg-white/5 px-2.5 h-9 text-[10px] font-extrabold text-slate-300 transition hover:text-rose-300 hover:border-rose-400/40">HIDE</button>
                          : u.status === "unpublished" || u.status === "flagged"
                            ? <button onClick={() => setStatus(u, "published")} title="Publish" className="rounded-lg border border-white/10 bg-white/5 px-2.5 h-9 text-[10px] font-extrabold text-slate-300 transition hover:text-emerald-300 hover:border-emerald-400/40">SHOW</button>
                            : null}
                        {confirmDelete === u.id ? (
                          <span className="flex items-center gap-1">
                            <button onClick={() => remove(u.id)} className="rounded-lg bg-rose-500 px-2.5 h-9 text-[10px] font-extrabold text-white">SURE?</button>
                            <button onClick={() => setConfirmDelete(null)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-400"><X size={14} /></button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmDelete(u.id)} title="Delete" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:text-rose-400 hover:border-rose-400/40"><Trash2 size={15} /></button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Members */}
          <aside className="animate-rise rounded-3xl border border-white/10 bg-slate-950/70 p-5" style={{ animationDelay: "140ms" }}>
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.2em] text-slate-400 mb-4"><Users size={15} className="text-amber-400" /> Members · {members.length}</h2>
            <ul className="space-y-2">
              {members.map(m => (
                <li key={m.id} className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-xs font-extrabold text-slate-950">{m.name.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{m.name}</p>
                    <p className="truncate text-[11px] text-slate-500">{m.email}</p>
                  </div>
                  {m.role === "admin" && <span className="rounded border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">ADMIN</span>}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-extrabold text-white">{preview.title} <span className="text-xs font-semibold text-slate-500">· {preview.detectedQuality} source</span></p>
              <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <video src={`/api/stream/${preview.videoFile}`} controls autoPlay className="aspect-video w-full rounded-2xl bg-black" />
            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-slate-400">
              <Link href={`/movie/${preview.id}`} className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 font-bold text-amber-300 hover:bg-amber-400/20"><Play size={12} /> Open public page</Link>
              <span>{preview.genre} · {preview.year} · {formatBytes(Number(preview.srcSizeBytes))}</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && <EditModal upload={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); fetchAll(); }} />}
    </div>
  );
}

function EditModal({ upload, onClose, onSaved }: { upload: Upload; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(upload.title);
  const [genre, setGenre] = useState(upload.genre);
  const [year, setYear] = useState(String(upload.year));
  const [synopsis, setSynopsis] = useState(upload.synopsis);
  const [status, setStatusV] = useState(upload.status);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/admin/uploads/${upload.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, genre, synopsis, status, year: parseInt(year, 10) || upload.year }),
    });
    onSaved();
  };

  const inputCls = "w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/60";

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-white text-lg">Edit upload</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div><label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Title</label><input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Genre</label><input value={genre} onChange={e => setGenre(e.target.value)} className={inputCls} /></div>
            <div><label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Year</label><input value={year} onChange={e => setYear(e.target.value.replace(/[^0-9]/g, ""))} className={inputCls} /></div>
          </div>
          <div><label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Synopsis</label><textarea value={synopsis} onChange={e => setSynopsis(e.target.value)} rows={3} className={`${inputCls} resize-none`} /></div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Status</label>
            <div className="flex gap-2 flex-wrap">
              {["published", "flagged", "unpublished"].map(s => (
                <button key={s} onClick={() => setStatusV(s)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold capitalize transition ${status === s ? STATUS_BADGE[s] : "border-white/10 text-slate-400 hover:text-white"}`}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="mt-5 w-full rounded-xl bg-amber-400 py-3 font-extrabold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
