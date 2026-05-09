/**
 * app/api/admin/reset/route.ts — operator-triggered conversation reset.
 *
 * POST { phone: E164 }. Wipes the conversation history (but keeps blocked +
 * counters) the same way a user texting "reset" does.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { clearConversation } from "@/lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ResetSchema = z.object({
  phone: z.string().min(2).max(32),
});

export async function POST(req: NextRequest): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = ResetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    await clearConversation(parsed.data.phone);
  } catch (err) {
    console.error("admin/reset: failed", err instanceof Error ? err.message : "");
    return NextResponse.json({ error: "reset_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
