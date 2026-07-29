"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
}

interface AuthCtxType {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthCtxType>({
  user: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me");
      const d = await r.json();
      setUser(d.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signOut = useCallback(async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    setUser(null);
  }, []);

  return <AuthCtx.Provider value={{ user, loading, refresh, signOut }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
