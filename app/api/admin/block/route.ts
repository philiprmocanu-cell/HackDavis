/**
 * app/api/admin/block/route.ts — block / unblock a phone number.
 *
 * POST { phone: E164, blocked: boolean }. Sets the `blocked` flag on the
 * ConversationRecord. The /api/sms route reads this flag and silently
 * drops messages from blocked numbers (returns empty TwiML).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { setBlocked } from "@/lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BlockSchema = z.object({
  phone: z.string().min(2).max(32),
  blocked: z.boolean(),
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

  const parsed = BlockSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    await setBlocked(parsed.data.phone, parsed.data.blocked);
  } catch (err) {
    console.error("admin/block: failed", err instanceof Error ? err.message : "");
    return NextResponse.json({ error: "block_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
