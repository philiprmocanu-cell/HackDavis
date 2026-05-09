// Server-side fetch helper for admin pages.
// Forwards the admin_session cookie to internal /api/admin/* routes and
// builds an absolute URL so it works in Server Components.

import { cookies, headers } from "next/headers";

function originFromHeaders(h: Headers): string {
  // Prefer x-forwarded-* when behind a proxy (Vercel etc.), then host header.
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function adminFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value ?? "";
  const h = await headers();
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    originFromHeaders(h);
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headersOut = new Headers(init.headers);
  if (session) {
    // Forward (or override) the cookie header.
    const existing = headersOut.get("cookie");
    const next = existing
      ? `${existing}; admin_session=${session}`
      : `admin_session=${session}`;
    headersOut.set("cookie", next);
  }
  return fetch(url, {
    ...init,
    headers: headersOut,
    cache: "no-store",
  });
}
