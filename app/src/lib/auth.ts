import crypto from "crypto";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

const SESSION_COOKIE = "session";
const SESSION_DAYS = 7;

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function sessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}

export const clearCookieHeader = `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export async function getSessionUser(request: Request): Promise<SafeUser | null> {
  const token = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
  if (!token) return null;
  try {
    const rows = await db
      .select({ user: users, expiresAt: sessions.expiresAt })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);
    if (rows.length === 0) return null;
    const u = rows[0].user;
    return { id: u.id, email: u.email, name: u.name, role: u.role, createdAt: String(u.createdAt) };
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    token,
    userId,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86400 * 1000),
  });
  return sessionCookieHeader(token);
}

export async function destroySession(request: Request): Promise<void> {
  const token = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

/** Idempotent: seeds the designated admin from env vars on first run. */
export async function ensureAdminSeed(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
    if (existing.length > 0) return;
    const taken = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (taken.length > 0) return;
    await db.insert(users).values({
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      name: "Studio Admin",
      role: "admin",
    });
  } catch (e) {
    console.error("Admin seed failed:", e);
  }
}

/* Simple in-memory rate limiter for credential endpoints (per email + ip). */
const attempts = new Map<string, { count: number; resetAt: number }>();
export function rateLimited(key: string, max = 8, windowMs = 60_000): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now > a.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  a.count += 1;
  return a.count > max;
}
