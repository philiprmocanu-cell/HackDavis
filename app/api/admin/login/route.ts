/**
 * app/api/admin/login/route.ts — single-password admin login.
 *
 * POST { password }. Constant-time compare against ADMIN_PASSWORD; on
 * success, set the HMAC-signed `admin_session` cookie and return { ok: true }.
 * On failure, 401 { error: "invalid" }.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  signAdminCookie,
  constantTimeEqual,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_MAX_AGE,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  password: z.string().min(1).max(512),
});

export async function POST(req: NextRequest): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (expected.length === 0) {
    // Fail closed if no password configured.
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  if (!constantTimeEqual(parsed.data.password, expected)) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const cookieValue = signAdminCookie();
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${ADMIN_COOKIE_NAME}=${cookieValue}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${ADMIN_COOKIE_MAX_AGE}`,
  ];
  if (isProd) parts.push("Secure");

  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": parts.join("; "),
    },
  });
}
