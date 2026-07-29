"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ShieldCheck, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth-client";

const links = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/publish", label: "Publish" },
  { href: "/downloads", label: "Downloads" },
  { href: "/watchlist", label: "Library" },
];

interface InboxItem { id: string; title: string; body: string; kind: string; status: string; createdAt: string; }

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function NotifBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const r = await fetch("/api/notifications");
        if (!r.ok) return;
        const d = await r.json();
        setItems(d.notifications.slice(0, 6));
        setUnread(d.unread);
      } catch {}
    };
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!user) return null;

  const markAll = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    setItems(i => i.map(x => ({ ...x, status: "read" })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button onClick={() => setOpen(o => !o)} className="relative grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:text-amber-300 hover:border-amber-400/40" aria-label="Notifications">
        <Bell size={16} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-80 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/60 backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Inbox</p>
            {unread > 0 && <button onClick={markAll} className="text-[11px] font-bold text-amber-400 hover:underline">Mark all read</button>}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No messages yet.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map(n => (
                <li key={n.id} className={`border-b border-white/5 px-4 py-3 ${n.status === "unread" ? "bg-amber-400/[0.04]" : ""}`}>
                  <div className="flex items-start gap-2">
                    {n.status === "unread" && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
                    <div>
                      <p className="text-sm font-bold text-white leading-snug">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{n.body}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => { setOpen(false); router.push("/profile"); }} className="block w-full border-t border-white/5 px-4 py-2.5 text-center text-xs font-bold text-amber-400 hover:bg-white/5">Open full inbox</button>
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  const path = usePathname();
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5 hidden md:flex items-center justify-between h-16 px-8">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-amber-400">CINEMA</Link>
        <div className="flex gap-5 text-sm font-medium text-slate-300">
          {links.map(l => <Link key={l.href} href={l.href} className={path === l.href ? "text-amber-400" : "hover:text-white transition"}>{l.label}</Link>)}
          {user?.role === "admin" && (
            <Link href="/admin" className={`inline-flex items-center gap-1 ${path.startsWith("/admin") ? "text-amber-400" : "text-emerald-400 hover:text-emerald-300"} transition`}>
              <ShieldCheck size={14} /> Admin
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NotifBell />
        {user ? (
          <Link href="/profile" className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-4 transition hover:border-amber-400/40">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-xs font-extrabold text-slate-950">{user.name.slice(0, 1).toUpperCase()}</span>
            <span className="text-sm font-bold text-white max-w-[10rem] truncate">{user.name}</span>
            {user.role === "admin" && <span className="rounded bg-emerald-400/15 border border-emerald-400/30 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">ADMIN</span>}
          </Link>
        ) : (
          <Link href="/auth" className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-amber-300 hover:-translate-y-0.5">
            <LogIn size={15} /> Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
