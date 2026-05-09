/**
 * lib/admin-auth.ts — HMAC-signed admin session cookie.
 *
 * The pilot has a single shared admin password (operator + Philip) and no
 * user accounts, so JWTs are overkill. We sign `<timestamp>.<hex-hmac>`
 * with HMAC-SHA256(timestamp, ADMIN_COOKIE_SECRET) and verify on every
 * admin request. Constant-time compare to keep timing leaks off the table.
 *
 * Cookie name is `admin_session`, age limit 7 days. `signAdminCookie()` is
 * called from /api/admin/login after the password check passes.
 */
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 7 * 86_400; // 7 days

function getSecret(): string {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error("ADMIN_COOKIE_SECRET is not set");
  }
  return secret;
}

function hmacHex(message: string, secret: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

export function signAdminCookie(): string {
  const ts = Date.now().toString();
  const sig = hmacHex(ts, getSecret());
  return `${ts}.${sig}`;
}

export function verifyAdminCookie(value: string | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  const dot = value.indexOf(".");
  if (dot <= 0 || dot === value.length - 1) return false;
  const ts = value.slice(0, dot);
  const sig = value.slice(dot + 1);

  // Compute expected HMAC.
  let expected: string;
  try {
    expected = hmacHex(ts, getSecret());
  } catch {
    return false;
  }

  // Both must be hex of identical length to compare safely.
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;

  // Age check.
  const tsNum = Number.parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return false;
  const ageMs = Date.now() - tsNum;
  if (ageMs < 0) return false;
  if (ageMs > MAX_AGE_SECONDS * 1000) return false;

  return true;
}

export async function getAdminCookie(
  _req?: NextRequest,
): Promise<string | undefined> {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value;
}

export async function requireAdmin(): Promise<NextResponse | null> {
  const value = await getAdminCookie();
  if (!verifyAdminCookie(value)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Constant-time compare of two strings. Used for password check in
 * /api/admin/login.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a ?? "", "utf8");
  const bb = Buffer.from(b ?? "", "utf8");
  if (ab.length !== bb.length) {
    // Still spend a comparison to keep timing roughly even.
    const filler = Buffer.alloc(Math.max(ab.length, bb.length, 1));
    timingSafeEqual(filler, filler);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE = MAX_AGE_SECONDS;
