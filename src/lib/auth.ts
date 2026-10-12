import "server-only";

import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "oc_admin";
const SESSION_MS = 1000 * 60 * 60 * 12;

type SessionPayload = {
  u: string;
  exp: number;
};

const attempts = new Map<string, { count: number; reset: number }>();
let attemptsSinceCleanup = 0;

function safeEqual(left: string, right: string) {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

function sessionSecret() {
  const value = process.env.SESSION_SECRET?.trim() ?? "";
  if (value.length < 32) return null;
  return value;
}

export function adminCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function credentialsMatch(usuario: string, password: string) {
  const accounts = [
    { user: process.env.ADMIN_USER?.trim() ?? "", password: process.env.ADMIN_PASSWORD ?? "" },
    { user: process.env.ADMIN_USER_2?.trim() ?? "", password: process.env.ADMIN_PASSWORD_2 ?? "" },
  ];
  let matches = false;
  for (const account of accounts) {
    if (!account.user || !account.password) continue;
    const userMatches = safeEqual(usuario.trim().toLowerCase(), account.user.toLowerCase());
    const passwordMatches = safeEqual(password, account.password);
    matches = (userMatches && passwordMatches) || matches;
  }
  return matches;
}

export function adminCredentialsConfigured() {
  return Boolean(
    (process.env.ADMIN_USER?.trim() && process.env.ADMIN_PASSWORD) ||
    (process.env.ADMIN_USER_2?.trim() && process.env.ADMIN_PASSWORD_2)
  );
}

export function allowAttempt(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (key.length > 200) return false;
  attemptsSinceCleanup += 1;
  if (attemptsSinceCleanup >= 256) {
    attemptsSinceCleanup = 0;
    for (const [attemptKey, entry] of attempts) if (entry.reset < now) attempts.delete(attemptKey);
  }
  if (attempts.size >= 10_000 && !attempts.has(key)) return false;
  const current = attempts.get(key);
  if (!current || current.reset < now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function createSessionToken(usuario: string) {
  const secret = sessionSecret();
  if (!secret) return null;
  const body = Buffer.from(
    JSON.stringify({ u: usuario, exp: Date.now() + SESSION_MS } satisfies SessionPayload)
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readSessionToken(token: string | undefined | null) {
  const secret = sessionSecret();
  if (!secret || !token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.u || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const jar = await cookies();
  return readSessionToken(jar.get(ADMIN_COOKIE)?.value);
}
