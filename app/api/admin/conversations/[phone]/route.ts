/**
 * app/api/admin/conversations/[phone]/route.ts — single conversation detail.
 *
 * URL param is the URL-encoded E.164 phone (the leading + survives encoding
 * as %2B). We decode, fetch, and return the full ConversationDetailResponse
 * so the dashboard can render the entire history with timestamps and segment
 * cost.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getConversation } from "@/lib/memory";
import type { ConversationDetailResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskPhone(phone: string): string {
  if (!phone || phone.length <= 7) return phone ?? "";
  const head = phone.slice(0, 3);
  const tail = phone.slice(-4);
  const stars = "X".repeat(Math.max(0, phone.length - head.length - tail.length));
  return `${head}${stars}${tail}`;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ phone: string }> },
): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { phone: rawPhone } = await ctx.params;
  let phone = rawPhone;
  try {
    phone = decodeURIComponent(rawPhone);
  } catch {
    // Use the raw string if decode fails.
  }

  let record;
  try {
    record = await getConversation(phone);
  } catch (err) {
    console.error("admin/conversations/[phone]: get failed", err instanceof Error ? err.message : "");
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  if (!record) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body: ConversationDetailResponse = {
    phone: record.phone,
    phoneMasked: maskPhone(record.phone),
    messages: record.messages ?? [],
    registerNote: record.registerNote,
    blocked: record.blocked,
    totalIn: record.totalIn ?? 0,
    totalOut: record.totalOut ?? 0,
    createdAt: record.createdAt ?? 0,
    updatedAt: record.updatedAt ?? 0,
  };

  return NextResponse.json(body);
}
