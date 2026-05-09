/**
 * app/api/admin/conversations/route.ts — list recent conversations.
 *
 * SCAN over `conv:*` (capped at 200 keys for the pilot), dereference each
 * to a ConversationRecord, then summarise into ConversationSummary[]:
 *   - phoneMasked: middle digits hidden so screenshots don't leak numbers.
 *   - lastMessage: most recent *user* message, truncated to 80 chars.
 *   - msgCount, primaryLang (most frequent assistant lang), registerNote,
 *     blocked.
 *
 * Sort newest-first by updatedAt. The /api/sms hot path doesn't read this,
 * so the SCAN cost is fine.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getConversation, scanConversationKeys } from "@/lib/memory";
import type {
  ConversationRecord,
  ConversationSummary,
  ConversationsListResponse,
  StoredMessage,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_KEYS = 200;

function maskPhone(phone: string): string {
  if (!phone) return "";
  // Keep country code + first digit and last 4 digits.
  // E.g. +919876543210 → "+91 9XXXXX3210".
  const digits = phone.replace(/[^\d]/g, "");
  const cc = phone.startsWith("+") ? phone.slice(0, phone.length - digits.length) + "" : "";
  // Use a simpler mask: keep first 3 chars and last 4 digits.
  if (phone.length <= 7) return phone;
  const head = phone.slice(0, 3);
  const tail = phone.slice(-4);
  const stars = "X".repeat(Math.max(0, phone.length - head.length - tail.length));
  // Insert a space after country code if present.
  return cc ? `${head} ${stars}${tail}` : `${head}${stars}${tail}`;
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function lastUserMessage(messages: StoredMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === "user" && typeof m.content === "string") {
      return m.content;
    }
  }
  return "";
}

function primaryAssistantLang(messages: StoredMessage[]): string | undefined {
  const counts = new Map<string, number>();
  for (const m of messages) {
    if (m.role === "assistant" && m.lang) {
      counts.set(m.lang, (counts.get(m.lang) ?? 0) + 1);
    }
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [lang, count] of counts.entries()) {
    if (count > bestCount) {
      best = lang;
      bestCount = count;
    }
  }
  return best;
}

function summarise(record: ConversationRecord): ConversationSummary {
  const messages = record.messages ?? [];
  const lastUser = lastUserMessage(messages);
  return {
    phone: record.phone,
    phoneMasked: maskPhone(record.phone),
    lastMessage: truncate(lastUser, 80),
    lastTs: record.updatedAt ?? 0,
    msgCount: messages.length,
    primaryLang: primaryAssistantLang(messages),
    registerNote: record.registerNote,
    blocked: record.blocked,
  };
}

export async function GET(): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;

  let keys: string[] = [];
  try {
    keys = await scanConversationKeys(MAX_KEYS);
  } catch (err) {
    console.error("admin/conversations: scan failed", err instanceof Error ? err.message : "");
    return NextResponse.json({ error: "scan_failed" }, { status: 500 });
  }

  const summaries: ConversationSummary[] = [];
  for (const key of keys) {
    const phone = key.startsWith("conv:") ? key.slice("conv:".length) : key;
    try {
      const record = await getConversation(phone);
      if (record) {
        summaries.push(summarise(record));
      }
    } catch (err) {
      console.error("admin/conversations: get failed", phone, err instanceof Error ? err.message : "");
    }
  }

  summaries.sort((a, b) => (b.lastTs ?? 0) - (a.lastTs ?? 0));

  const body: ConversationsListResponse = {
    conversations: summaries.slice(0, MAX_KEYS),
  };
  return NextResponse.json(body);
}
