"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bebas_Neue, Archivo } from "next/font/google";
import { Mail, Lock, User as UserIcon, KeyRound, ArrowRight, Clapperboard, Inbox, Wand2 } from "lucide-react";
import { useAuth } from "@/lib/auth-client";

const display = Bebas_Neue({ weight: "400", subsets: ["latin"] });
const body = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

const inputCls = "w-full rounded-xl border border-white/10 bg-slate-900/80 py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 transition";
const labelCls = "block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400 mb-1.5";

function AuthInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/profile";
  const { refresh, user } = useAuth();

  const [tab, setTab] = useState<"signin" | "signup" | "reset">(user ? "signin" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const post = async (url: string, payload: unknown) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Something went wrong.");
    return d;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      if (tab === "signin") {
        await post("/api/auth/login", { email, password });
        await refresh();
        router.push(next);
      } else if (tab === "signup") {
        await post("/api/auth/register", { email, password, name });
        await refresh();
        router.push(next === "/auth" ? "/profile" : next);
      } else {
        if (!demoCode) {
          const d = await post("/api/auth/request-reset", { email });
          setDemoCode(d.demoCode || "sent");
          setNotice(d.demoCode
            ? `Reset code generated. (Demo shows it here; production emails it.) Code: ${d.demoCode}`
            : "If that account exists, a reset code was sent.");
        } else {
          await post("/api/auth/complete-reset", { email, code, newPassword: password });
          setNotice("Password updated — sign in with your new password.");
          setDemoCode(null); setCode(""); setPassword("");
          setTab("signin");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={body.className}>
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .animate-rise { animation: rise .5s cubic-bezier(.2,.7,.2,1) both; }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-32 -left-32 h-[30rem] w-[30rem] rounded-full bg-amber-500/[0.07] blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-rose-600/[0.06] blur-[120px]" />
      </div>

      <main className="relative z-10 pt-24 md:pt-28 pb-28 px-4 max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Pitch side */}
        <section className="animate-rise">
          <p className="text-[11px] font-bold tracking-[0.35em] text-amber-400/80 uppercase mb-3 flex items-center gap-2"><Clapperboard size={14} /> Members' lounge</p>
          <h1 className={`${display.className} text-6xl md:text-7xl leading-[0.9] text-white`}>
            YOUR NAME<br />ON THE <span className="text-amber-400">MARQUEE</span>
          </h1>
          <ul className="mt-8 space-y-4">
            {[
              { icon: Wand2, title: "Publish under your identity", text: "Uploads attach to your profile with live processing updates." },
              { icon: Inbox, title: "Private inbox", text: "Welcome notes, transcode alerts and moderation messages — scoped to you alone." },
              { icon: KeyRound, title: "Secure sessions", text: "Hashed passwords, HTTP-only cookies, rate-limited sign-in." },
            ].map(p => (
              <li key={p.title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-400/25 bg-amber-400/[0.07] text-amber-300"><p.icon size={19} /></span>
                <div>
                  <p className="font-extrabold text-white">{p.title}</p>
                  <p className="text-sm text-slate-400">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-slate-500">Just browsing? Guests can watch, search and download freely — no account needed.</p>
        </section>

        {/* Form side */}
        <section className="animate-rise" style={{ animationDelay: "100ms" }}>
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-7 md:p-8 shadow-2xl shadow-black/50">
            <div className="flex rounded-xl border border-white/10 bg-slate-900/70 p-1 mb-6">
              {(["signin", "signup", "reset"] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setError(""); setNotice(""); setDemoCode(null); }}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${tab === t ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"}`}>
                  {t === "signin" ? "Sign in" : t === "signup" ? "Create account" : "Reset"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              {tab === "signup" && (
                <div>
                  <label className={labelCls}>Display name</label>
                  <div className="relative"><UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ava Stone" className={inputCls} /></div>
                </div>
              )}
              <div>
                <label className={labelCls}>Email</label>
                <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@studio.com" className={inputCls} /></div>
              </div>
              <div>
                <label className={labelCls}>{tab === "reset" && demoCode ? "New password" : "Password"}</label>
                <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} /></div>
              </div>
              {tab === "reset" && demoCode && (
                <div>
                  <label className={labelCls}>6-digit code</label>
                  <div className="relative"><KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                    <input value={code} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" className={inputCls} /></div>
                </div>
              )}

              {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300">{error}</p>}
              {notice && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300">{notice}</p>}

              <button type="submit" disabled={busy}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3.5 font-extrabold text-slate-950 transition hover:bg-amber-300 hover:-translate-y-0.5 disabled:opacity-50">
                {busy ? "One moment…" : tab === "signin" ? "Sign in" : tab === "signup" ? "Create my account" : demoCode ? "Set new password" : "Send reset code"}
                {!busy && <ArrowRight size={17} className="transition group-hover:translate-x-1" />}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-slate-500">
              {tab === "signin" ? "New here? Create an account — it takes ten seconds." : tab === "signup" ? "Already a member? Switch to Sign in." : "Remembered it? Back to Sign in."}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-slate-500">Loading…</div>}>
      <AuthInner />
    </Suspense>
  );
}
